# Script to enable TCP/IP for SQLEXPRESS and restart the service
Write-Host "Enabling TCP/IP for SQL Server Express (SQLEXPRESS)..." -ForegroundColor Cyan

$wmi = Get-WmiObject -Namespace "root\Microsoft\SqlServer\ComputerManagement16" -Class ServerNetworkProtocol | Where-Object { $_.InstanceName -eq "SQLEXPRESS" -and $_.ProtocolDisplayName -eq "TCP/IP" }
if ($wmi) {
    $wmi.SetEnable()
    Write-Host "TCP/IP enabled on SQLEXPRESS." -ForegroundColor Green
}

$ipAll = Get-WmiObject -Namespace "root\Microsoft\SqlServer\ComputerManagement16" -Class ServerNetworkProtocolProperty | Where-Object { $_.InstanceName -eq "SQLEXPRESS" -and $_.ProtocolName -eq "Tcp" -and $_.IPAddressName -eq "IPAll" -and $_.PropertyName -eq "TcpPort" }
if ($ipAll) {
    $ipAll.SetStringValue("1433")
    Write-Host "Set IPAll TcpPort to 1433." -ForegroundColor Green
}

$ipAllDyn = Get-WmiObject -Namespace "root\Microsoft\SqlServer\ComputerManagement16" -Class ServerNetworkProtocolProperty | Where-Object { $_.InstanceName -eq "SQLEXPRESS" -and $_.ProtocolName -eq "Tcp" -and $_.IPAddressName -eq "IPAll" -and $_.PropertyName -eq "TcpDynamicPorts" }
if ($ipAllDyn) {
    $ipAllDyn.SetStringValue("")
    Write-Host "Cleared IPAll TcpDynamicPorts." -ForegroundColor Green
}

Write-Host "Restarting MSSQL`$SQLEXPRESS service..." -ForegroundColor Cyan
Restart-Service -Name "MSSQL`$SQLEXPRESS" -Force
Write-Host "SQL Server Express is now listening on port 1433!" -ForegroundColor Green
Start-Sleep -Seconds 2
