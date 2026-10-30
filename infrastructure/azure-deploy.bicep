// Azure Bicep Infrastructure Template for FleetFlow
@description('Environment name (e.g. dev, staging, prod)')
param environmentName string = 'prod'

@description('Azure Region')
param location string = resourceGroup().location

@description('Database administrator login')
param dbAdminLogin string = 'fleetadmin'

@secure()
@description('Database administrator password')
param dbAdminPassword string

var appServicePlanName = 'plan-fleetflow-${environmentName}'
var backendAppName = 'app-fleetflow-api-${environmentName}'
var dbServerName = 'psql-fleetflow-${environmentName}'
var storageAccountName = 'stfleetflow${environmentName}'

// 1. Storage Account for Parquet Analytics & Blobs
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    allowBlobPublicAccess: false
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: storageAccount
  name: 'default'
}

resource analyticsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobService
  name: 'fleetflow-analytics'
  properties: {
    publicAccess: 'None'
  }
}

// 2. PostgreSQL Flexible Server
resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-03-01-preview' = {
  name: dbServerName
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: '16'
    administratorLogin: dbAdminLogin
    administratorLoginPassword: dbAdminPassword
    storage: {
      storageSizeGB: 32
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
  }
}

resource postgresDatabase 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-03-01-preview' = {
  parent: postgresServer
  name: 'fleetflow'
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

// 3. App Service Plan (Linux)
resource appServicePlan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: appServicePlanName
  location: location
  kind: 'linux'
  sku: {
    name: 'B1'
    tier: 'Basic'
  }
  properties: {
    reserved: true
  }
}

// 4. FastAPI Backend App Service
resource backendApp 'Microsoft.Web/sites@2022-09-01' = {
  name: backendAppName
  location: location
  kind: 'app,linux'
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: 'PYTHON|3.12'
      appSettings: [
        {
          name: 'APP_ENV'
          value: environmentName
        }
        {
          name: 'DATABASE_URL'
          value: 'postgresql://${dbAdminLogin}:${dbAdminPassword}@${postgresServer.properties.fullyQualifiedDomainName}:5432/fleetflow?sslmode=require'
        }
        {
          name: 'STORAGE_BACKEND'
          value: 'azure_blob'
        }
        {
          name: 'AZURE_STORAGE_CONNECTION_STRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=core.windows.net'
        }
        {
          name: 'AZURE_CONTAINER_NAME'
          value: 'fleetflow-analytics'
        }
      ]
    }
  }
}

output backendUrl string = backendApp.properties.defaultHostName
output storageName string = storageAccount.name
output dbServerHost string = postgresServer.properties.fullyQualifiedDomainName
