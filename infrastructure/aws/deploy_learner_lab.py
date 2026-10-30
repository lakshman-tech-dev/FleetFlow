"""
AWS Learner Lab Automated Deployment Script for FleetFlow.
Provisions:
1. S3 Data Lake Bucket
2. EC2 Security Group (Ports 22, 80, 8000, 5173)
3. EC2 Instance (t3.medium) with LabInstanceProfile, vockey KeyPair, and UserData
4. Automatically prints Public IP, Frontend URL, and API Documentation URL
"""

import boto3
import time
import base64

REGION = "us-east-1"
BUCKET_NAME = "fleetflow-analytics-038719169064"
SG_NAME = "fleetflow-platform-sg"
INSTANCE_TYPE = "t3.medium"
KEY_NAME = "vockey"
IAM_PROFILE = "LabInstanceProfile"
AMI_ID = "ami-0d27e0fb3bac4d724"  # Amazon Linux 2023 in us-east-1

USER_DATA_SCRIPT = """#!/bin/bash
set -e
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

echo "============================================="
echo "Starting FleetFlow AWS Auto-Provisioning"
echo "============================================="

# 1. Update system & install prerequisites
yum update -y
yum install -y docker git curl

# 2. Start and enable Docker
systemctl enable docker
systemctl start docker
usermod -a -G docker ec2-user

# 3. Install Docker Compose v2 plugin
mkdir -p /usr/local/lib/docker/cli-plugins
curl -SL https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
ln -sf /usr/local/lib/docker/cli-plugins/docker-compose /usr/bin/docker-compose

echo "Docker and Docker Compose installed."

# 4. Clone or setup project directory
cd /home/ec2-user
mkdir -p fleetflow-app
chown -R ec2-user:ec2-user /home/ec2-user

echo "EC2 Initial provisioning complete." > /home/ec2-user/provision_done.txt
"""

def deploy():
    print("[1/4] Connecting to AWS us-east-1...")
    session = boto3.Session(region_name=REGION)
    ec2 = session.client("ec2")
    s3 = session.client("s3")

    # 1. S3 Bucket
    print(f"[2/4] Ensuring S3 Bucket '{BUCKET_NAME}'...")
    try:
        s3.create_bucket(Bucket=BUCKET_NAME)
        print(f"      Created bucket: {BUCKET_NAME}")
    except Exception as e:
        if "BucketAlreadyOwnedByYou" in str(e) or "BucketAlreadyExists" in str(e):
            print(f"      Bucket already exists and is ready.")
        else:
            print(f"      Bucket note: {e}")

    # 2. Security Group
    print(f"[3/4] Configuring Security Group '{SG_NAME}'...")
    vpcs = ec2.describe_vpcs(Filters=[{'Name': 'isDefault', 'Values': ['true']}])['Vpcs']
    vpc_id = vpcs[0]['VpcId']

    try:
        sg_res = ec2.create_security_group(
            GroupName=SG_NAME,
            Description="Security Group for FleetFlow Platform (Web, API, SSH)",
            VpcId=vpc_id
        )
        sg_id = sg_res["GroupId"]
        print(f"      Created Security Group: {sg_id}")
    except Exception:
        sgs = ec2.describe_security_groups(Filters=[{'Name': 'group-name', 'Values': [SG_NAME]}])['SecurityGroups']
        sg_id = sgs[0]['GroupId']
        print(f"      Using existing Security Group: {sg_id}")

    # Authorize ports
    ports = [
        (22, "SSH Access"),
        (80, "HTTP Web Frontend"),
        (8000, "FastAPI Backend API"),
        (5173, "Vite Frontend Dev"),
    ]
    for port, desc in ports:
        try:
            ec2.authorize_security_group_ingress(
                GroupId=sg_id,
                IpPermissions=[{
                    'IpProtocol': 'tcp',
                    'FromPort': port,
                    'ToPort': port,
                    'IpRanges': [{'CidrIp': '0.0.0.0/0', 'Description': desc}]
                }]
            )
            print(f"      Port {port} ({desc}) authorized.")
        except Exception as e:
            if "InvalidPermission.Duplicate" in str(e):
                pass
            else:
                print(f"      Port {port} note: {e}")

    # 3. Check for existing running instance
    print("[4/4] Checking EC2 instances...")
    inst_resp = ec2.describe_instances(
        Filters=[
            {'Name': 'tag:Name', 'Values': ['FleetFlow-Production-Server']},
            {'Name': 'instance-state-name', 'Values': ['pending', 'running']}
        ]
    )

    existing_instances = [i for r in inst_resp['Reservations'] for i in r['Instances']]
    if existing_instances:
        inst = existing_instances[0]
        instance_id = inst['InstanceId']
        public_ip = inst.get('PublicIpAddress', 'Allocating...')
        print(f"      Existing running instance found: {instance_id} ({public_ip})")
    else:
        print(f"      Launching new EC2 instance ({INSTANCE_TYPE}, {AMI_ID})...")
        run_res = ec2.run_instances(
            ImageId=AMI_ID,
            InstanceType=INSTANCE_TYPE,
            KeyName=KEY_NAME,
            IamInstanceProfile={'Name': IAM_PROFILE},
            SecurityGroupIds=[sg_id],
            MinCount=1,
            MaxCount=1,
            UserData=USER_DATA_SCRIPT,
            TagSpecifications=[{
                'ResourceType': 'instance',
                'Tags': [
                    {'Key': 'Name', 'Value': 'FleetFlow-Production-Server'},
                    {'Key': 'Environment', 'Value': 'Wipro-CPPE-Capstone'},
                    {'Key': 'Project', 'Value': 'FleetFlow'}
                ]
            }]
        )
        instance_id = run_res['Instances'][0]['InstanceId']
        print(f"      Instance {instance_id} requested. Waiting for public IP...")

        # Wait for instance running
        waiter = ec2.get_waiter('instance_running')
        waiter.wait(InstanceIds=[instance_id])

        desc = ec2.describe_instances(InstanceIds=[instance_id])['Reservations'][0]['Instances'][0]
        public_ip = desc.get('PublicIpAddress', 'Unknown')
        print(f"      Instance is RUNNING with Public IP: {public_ip}")

    print("\n=======================================================")
    print(" FLEETFLOW AWS LEARNER LAB DEPLOYMENT SUMMARY")
    print("=======================================================")
    print(f"Instance ID      : {instance_id}")
    print(f"Public IP        : {public_ip}")
    print(f"Frontend URL     : http://{public_ip}")
    print(f"FastAPI Docs     : http://{public_ip}:8000/docs")
    print(f"S3 Data Lake     : s3://{BUCKET_NAME}")
    print(f"SSH Command      : ssh -i infrastructure/aws/labsuser.pem ec2-user@{public_ip}")
    print("=======================================================")
    return {
        "instance_id": instance_id,
        "public_ip": public_ip,
        "bucket_name": BUCKET_NAME
    }

if __name__ == "__main__":
    deploy()
