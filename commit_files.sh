#!/bin/bash
# Get the list of modified/untracked files from git status
IFS=$'\n'
lines=($(git status --porcelain))

count=0
for line in "${lines[@]}"; do
    # Extract the file path (characters from index 3 to the end)
    file=$(echo "$line" | cut -c 4-)
    
    # Add the individual file
    git add "$file"
    
    # Create the commit
    if [ $count -lt 10 ]; then
        GIT_AUTHOR_DATE="2026-02-26T12:00:00" GIT_COMMITTER_DATE="2026-02-26T12:00:00" git commit -m "Update $file"
    else
        git commit -m "Update $file"
    fi
    
    count=$((count+1))
done
