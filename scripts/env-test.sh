export GITHUB_USER=$(aws ssm get-parameter \
	--name "/furu/github-user" \
	--query "Parameter.Value" \
	--output "text")

export GITHUB_PAT=$(aws ssm get-parameter \
	--name "/furu/github-pat" \
	--query "Parameter.Value" \
	--output "text")

export COMMIT_ID=$(aws ssm get-parameter \
	--name "/furu/commit-id" \
	--query "Parameter.Value" \
	--output "text")

git clone https://${GITHUB_USER}:${GITHUB_PAT}@github.com/cloudydaiyz/furu.git app
cd app
git checkout $COMMIT_ID
pnpm install --frozen-lockfile
pnpm run -r build
pnpm deploy --filter=@cloudydaiyz/furu-controller-app --prod prod/controller
cd prod/controller
pnpm start