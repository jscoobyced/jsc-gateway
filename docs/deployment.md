# Deployment

## Run the application from a Docker image

From the repository root, you can start the published image and bind the local key and route files into the container:

```bash
docker run -it --rm \
  -e JWT_PUBLIC_KEY_PATH=/app/public.jwks.json \
  -e JWT_PRIVATE_KEY_PATH=/app/private.jwks.json \
  -e ROUTES_CONFIG=/app/routes.json \
  --mount type=bind,source=$(pwd)/code/config/keys/public.jwks.json,target=/app/public.jwks.json \
  --mount type=bind,source=$(pwd)/code/config/keys/private.jwks.json,target=/app/private.jwks.json \
  --mount type=bind,source=$(pwd)/code/config/routes.json,target=/app/routes.json \
  -p 0.0.0.0:3000:3000 \
  -e JWT_AUDIENCE=my-api \
  jscdroiddev/jsc-gateway:latest
```

Notes:

- Run the command from the repository root so `$(pwd)` resolves correctly.
- The mounted files come from `code/config/keys/` and `code/config/routes.json`.
- The container listens on port `3000`, so the gateway will be reachable at `http://localhost:3000`.
- If your environment requires explicit issuer or JWKS endpoint values, also pass `JWT_ISSUER` and `JWKS_URL` with additional `-e` flags.

## Deploy to a Kubernetes cluster with kubectl

The Kubernetes manifests for this project are stored in `etc/k8s/`:

- `etc/k8s/01-configmap.example.yaml`
- `etc/k8s/02-deployment.yaml`
- `etc/k8s/03-service.yaml`

Before applying them:

1. Update the namespace (`my-ns`) to match your cluster.
2. Fill in the real values for `routes.json`, `private.jwks.json`, and `public.jwks.json` in the ConfigMap manifest.
3. Review the service settings such as `externalIPs` and adjust them for your environment.

Then deploy everything with `kubectl`:

```bash
kubectl create namespace my-ns
kubectl apply -f etc/k8s/01-configmap.example.yaml
kubectl apply -f etc/k8s/02-deployment.yaml
kubectl apply -f etc/k8s/03-service.yaml
```

You can also apply the whole folder at once:

```bash
kubectl apply -f etc/k8s/
```

Verify that the rollout completed successfully:

```bash
kubectl get configmap,deployment,pods,svc -n my-ns
kubectl rollout status deployment/jsc-gateway-app -n my-ns
```
