# Automated QA status

CI workflow configured to run on push, pull request and manual dispatch. This archive is not deployed or uploaded to GitHub. GitHub Actions, D1 production and deployment are NOT TESTED. The production smoke test is conditional on the repository variable PRODUCTION_URL; absent configuration it explicitly prints NOT TESTED and exits successfully, which is not a production PASS. No production secrets are bundled. The repository must be identified before any remote write.
