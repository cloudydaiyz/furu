set -euo pipefail

aws ssm put-parameter \
	--name "/furu/github-user" \
	--value $GITHUB_USER \
	--type "String" \
	--overwrite

aws ssm put-parameter \
	--name "/furu/github-pat" \
	--value $GITHUB_PAT \
	--type "String" \
	--overwrite
	
aws ssm put-parameter \
	--name "/furu/commit-id" \
	--value $COMMIT_ID \
	--type "String" \
	--overwrite
	
aws ssm put-parameter \
	--name "/furu/furu-controller-access-key" \
	--value $FURU_CONTROLLER_ACCESS_KEY \
	--type "String" \
	--overwrite

aws ssm put-parameter \
	--name "/furu/vnc-password" \
	--value $VNC_PASSWORD \
	--type "String" \
	--overwrite