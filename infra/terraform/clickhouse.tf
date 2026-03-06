data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_security_group" "clickhouse" {
  name_prefix = "beacon-clickhouse-"
  description = "ClickHouse server access"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "ClickHouse native protocol from ECS"
    from_port       = 9000
    to_port         = 9000
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  ingress {
    description     = "ClickHouse HTTP from ECS"
    from_port       = 8123
    to_port         = 8123
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "beacon-clickhouse-sg" }
}

resource "aws_instance" "clickhouse" {
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = "t3.medium"
  subnet_id              = aws_subnet.private[0].id
  vpc_security_group_ids = [aws_security_group.clickhouse.id]

  root_block_device {
    volume_size = 50
    volume_type = "gp3"
  }

  user_data = base64encode(<<-EOF
    #!/bin/bash
    set -e
    yum install -y yum-utils
    yum-config-manager --add-repo https://packages.clickhouse.com/rpm/clickhouse.repo
    yum install -y clickhouse-server clickhouse-client

    # Configure beacon user
    cat > /etc/clickhouse-server/users.d/beacon.xml <<XMLEOF
    <clickhouse>
      <users>
        <beacon>
          <password>${var.clickhouse_password}</password>
          <networks><ip>::/0</ip></networks>
          <profile>default</profile>
          <quota>default</quota>
          <access_management>1</access_management>
        </beacon>
      </users>
    </clickhouse>
    XMLEOF

    # Listen on all interfaces
    cat > /etc/clickhouse-server/config.d/listen.xml <<XMLEOF
    <clickhouse>
      <listen_host>0.0.0.0</listen_host>
    </clickhouse>
    XMLEOF

    systemctl enable clickhouse-server
    systemctl start clickhouse-server

    # Create database
    clickhouse-client --user beacon --password '${var.clickhouse_password}' \
      --query "CREATE DATABASE IF NOT EXISTS beacon"
  EOF
  )

  tags = { Name = "beacon-clickhouse" }
}
