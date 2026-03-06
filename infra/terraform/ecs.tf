# --- ECR repositories ---

resource "aws_ecr_repository" "api" {
  name                 = "beacon/api"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  tags = { Name = "beacon-api" }
}

resource "aws_ecr_repository" "drift" {
  name                 = "beacon/drift"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  tags = { Name = "beacon-drift" }
}

# --- ECS cluster ---

resource "aws_ecs_cluster" "main" {
  name = "beacon-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = { Name = "beacon-cluster" }
}

# --- IAM ---

resource "aws_iam_role" "ecs_execution" {
  name = "beacon-ecs-execution-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "ecs_task" {
  name = "beacon-ecs-task-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "ecs_task" {
  name = "beacon-ecs-task-policy"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["kinesis:PutRecord", "kinesis:PutRecords", "kinesis:DescribeStream"]
        Resource = aws_kinesis_stream.traces.arn
      },
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:GetObject"]
        Resource = "${aws_s3_bucket.raw_traces.arn}/*"
      }
    ]
  })
}

# --- Security group for ECS tasks ---

resource "aws_security_group" "ecs_tasks" {
  name_prefix = "beacon-ecs-"
  description = "ECS task networking"
  vpc_id      = aws_vpc.main.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "beacon-ecs-sg" }
}

resource "aws_security_group" "alb" {
  name_prefix = "beacon-alb-"
  description = "ALB public access"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "beacon-alb-sg" }
}

resource "aws_security_group_rule" "ecs_from_alb" {
  type                     = "ingress"
  from_port                = 8080
  to_port                  = 8080
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.alb.id
  security_group_id        = aws_security_group.ecs_tasks.id
}

# --- ALB ---

resource "aws_lb" "api" {
  name               = "beacon-api-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  tags = { Name = "beacon-api-alb" }
}

resource "aws_lb_target_group" "api" {
  name        = "beacon-api-${var.environment}"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/api/stats"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
  }

  tags = { Name = "beacon-api-tg" }
}

resource "aws_lb_listener" "api" {
  load_balancer_arn = aws_lb.api.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}

# --- CloudWatch log groups ---

resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/beacon-api"
  retention_in_days = 30

  tags = { Name = "beacon-api-logs" }
}

resource "aws_cloudwatch_log_group" "drift" {
  name              = "/ecs/beacon-drift"
  retention_in_days = 30

  tags = { Name = "beacon-drift-logs" }
}

# --- Task definitions ---

locals {
  clickhouse_dsn = "clickhouse://beacon:${var.clickhouse_password}@${aws_instance.clickhouse.private_ip}:9000/beacon"
}

resource "aws_ecs_task_definition" "api" {
  family                   = "beacon-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "api"
    image     = "${aws_ecr_repository.api.repository_url}:latest"
    essential = true

    portMappings = [{ containerPort = 8080, protocol = "tcp" }]

    environment = [
      { name = "CLICKHOUSE_DSN", value = local.clickhouse_dsn },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.api.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "api"
      }
    }
  }])

  tags = { Name = "beacon-api-task" }
}

resource "aws_ecs_task_definition" "drift" {
  family                   = "beacon-drift"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "drift"
    image     = "${aws_ecr_repository.drift.repository_url}:latest"
    essential = true

    environment = [
      { name = "CLICKHOUSE_DSN", value = local.clickhouse_dsn },
      { name = "DRIFT_INTERVAL", value = "5m" },
      { name = "DRIFT_THRESHOLD", value = "0.2" },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.drift.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "drift"
      }
    }
  }])

  tags = { Name = "beacon-drift-task" }
}

# --- ECS services ---

resource "aws_ecs_service" "api" {
  name            = "beacon-api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 8080
  }

  depends_on = [aws_lb_listener.api]

  tags = { Name = "beacon-api-service" }
}

resource "aws_ecs_service" "drift" {
  name            = "beacon-drift"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.drift.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  tags = { Name = "beacon-drift-service" }
}

# --- Auto-scaling ---

resource "aws_appautoscaling_target" "api" {
  max_capacity       = 4
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.api.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "api_cpu" {
  name               = "beacon-api-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.api.resource_id
  scalable_dimension = aws_appautoscaling_target.api.scalable_dimension
  service_namespace  = aws_appautoscaling_target.api.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}

resource "aws_appautoscaling_target" "drift" {
  max_capacity       = 4
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.drift.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "drift_cpu" {
  name               = "beacon-drift-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.drift.resource_id
  scalable_dimension = aws_appautoscaling_target.drift.scalable_dimension
  service_namespace  = aws_appautoscaling_target.drift.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}
