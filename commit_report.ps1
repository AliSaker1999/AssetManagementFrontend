$lines = git log --pretty=format:"COMMIT,%h,%an,%ad,%s" --date=short --numstat

$report = @()
$current = $null
$add = 0
$del = 0

foreach ($line in $lines) {
    if ($line -match '^COMMIT,') {
        if ($current) {
            $report += [PSCustomObject]@{
                Commit  = $current
                Added   = $add
                Deleted = $del
            }
        }
        $parts = $line -split ',', 5
        $current = "$($parts[1]) | $($parts[2]) | $($parts[3]) | $($parts[4])"
        $add = 0
        $del = 0
    }
    elseif ($line -match '^\d+\s+\d+\s+') {
        $nums = $line -split "\s+"
        if ($nums[0] -match '^\d+$') { $add += [int]$nums[0] }
        if ($nums[1] -match '^\d+$') { $del += [int]$nums[1] }
    }
}
if ($current) {
    $report += [PSCustomObject]@{
        Commit  = $current
        Added   = $add
        Deleted = $del
    }
}

$report | Export-Csv -Path commit_report.csv -NoTypeInformation