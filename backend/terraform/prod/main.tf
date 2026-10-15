terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    mongodbatlas = {
      source  = "mongodb/mongodbatlas"
      version = "~> 1.10"
    }
  }
  backend "s3" {
    bucket         = "salonnow-tf-state-prod"
    key            = "platform/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "salonnow-tf-locks-prod"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Environment = var.environment
      Project     = "SalonNow"
      ManagedBy   = "Terraform"
    }
  }
}

module "vpc" {
  source = "../modules/vpc"

  vpc_cidr             = "10.0.0.0/16"
  public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnet_cidrs = ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]
  availability_zones   = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

module "eks" {
  source = "../modules/eks"

  cluster_name    = "salonnow-prod-eks"
  vpc_id          = module.vpc.vpc_id
  private_subnets = module.vpc.private_subnet_ids

  node_groups = {
    general = {
      instance_types = ["m6i.xlarge"]
      min_size       = 10
      max_size       = 100
      desired_size   = 10
    }
  }
}
