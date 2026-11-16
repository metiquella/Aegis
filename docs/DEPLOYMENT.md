# Deployment

## Container

    docker build -t fraud-agent .
    docker run -p 8080:8080 fraud-agent

## Configuration

- `PORT` - HTTP port (default 8080)
- `LOG_REQUESTS=1` - enable request logging
- `AGENT_CONFIG` - path to a JSON threshold config (see agent.config.json)

## Health check

    curl http://localhost:8080/health

## Scaling

The agent is stateless apart from per-process rolling metrics; run multiple
replicas behind a load balancer.
