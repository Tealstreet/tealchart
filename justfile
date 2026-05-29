set positional-arguments

default:
    just --list

# Start a feature branch from the latest mirror master.
start branch:
    git switch master
    git pull --ff-only origin master
    git switch -c {{branch}}

# Push the current branch and open a GitHub pull request.
pr:
    git push -u origin HEAD
    gh pr create --fill

# Run the same checks expected before opening a pull request.
check:
    yarn typecheck
    yarn lint
    yarn test

# Return to a clean, current master after your PR is merged.
done branch:
    git switch master
    git pull --ff-only origin master
    git branch -d {{branch}}
