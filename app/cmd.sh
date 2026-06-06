git log --follow --reverse  -- "migrations/2024-02-12-050403_test_migration/down.sql" | head -n 1 | 
awk '{print $2}' | tr -d '\n' | xargs -I {} git show {} -- "migrations/2024-02-12-050403_test_migration/down.sql" |
grep -E "Author:|Date:" 



