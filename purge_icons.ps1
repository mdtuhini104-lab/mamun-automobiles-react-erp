$files = @(
    "e:\ai coding\app\Mamun-automobiles\src\JobCardsPage.jsx",
    "e:\ai coding\app\Mamun-automobiles\src\UserManagementPage.jsx",
    "e:\ai coding\app\Mamun-automobiles\src\SuppliersPage.jsx",
    "e:\ai coding\app\Mamun-automobiles\src\ServicesPage.jsx",
    "e:\ai coding\app\Mamun-automobiles\src\SalaryPage.jsx",
    "e:\ai coding\app\Mamun-automobiles\src\RentACarPage.jsx",
    "e:\ai coding\app\Mamun-automobiles\src\PurchasePage.jsx",
    "e:\ai coding\app\Mamun-automobiles\src\LoanManagementPage.jsx",
    "e:\ai coding\app\Mamun-automobiles\src\LedgersPage.jsx",
    "e:\ai coding\app\Mamun-automobiles\src\ExpensesPage.jsx",
    "e:\ai coding\app\Mamun-automobiles\src\DailyExpenseSubModule.jsx",
    "e:\ai coding\app\Mamun-automobiles\src\CarBuyingPage.jsx",
    "e:\ai coding\app\Mamun-automobiles\src\BankingModule.jsx",
    "e:\ai coding\app\Mamun-automobiles\src\WorkOrderPage.jsx",
    "e:\ai coding\app\Mamun-automobiles\src\UsedBuySell.jsx",
    "e:\ai coding\app\Mamun-automobiles\src\SettingsPage.jsx",
    "e:\ai coding\app\Mamun-automobiles\src\ReportsPage.jsx",
    "e:\ai coding\app\Mamun-automobiles\src\DashboardPage.jsx"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        
        # Remove Lucide imports
        $content = $content -replace 'import \{[^}]*\} from ''lucide-react'';', ''
        $content = $content -replace 'import \{[^}]*\} from "lucide-react";', ''
        
        # Remove Ant Design icons imports
        $content = $content -replace 'import \{[^}]*\} from ''@ant-design/icons'';', ''
        $content = $content -replace 'import \{[^}]*\} from "@ant-design/icons";', ''
        
        # Remove icon props from components (icon={<... />})
        $content = $content -replace 'icon=\{<[^>]+>\}\s*', ''
        
        # Remove direct icon components (<Wrench size={14} ... />)
        # This is a bit risky but we'll target common ones or a general pattern
        # We'll use a regex for <CapitalizedWord followed by size or other props />
        # But we need to be careful not to remove regular components
        # We'll target patterns like <IconName size={...} /> or <IconName /> where IconName is common icon
        $icons = @("Wrench", "CheckCircle", "PlusCircle", "Search", "Filter", "Calendar", "LayoutDashboard", "MoreVertical", "Plus", "UserPlus", "FileSpreadsheet", "Send", "CheckCircle2", "AlertCircle", "Clock", "Trash2", "Printer", "ChevronRight", "UserCog", "Package", "Pencil", "FileText", "PackagePlus", "PackageOpen", "History", "LogOut", "ClipboardList", "UserCheck", "Wallet", "Building2", "CreditCard", "Settings", "Trash", "Edit", "Download", "ExternalLink", "Mail", "Phone", "MapPin", "User", "Lock", "Eye", "EyeOff", "Bell", "Menu", "X", "ChevronDown", "ChevronUp", "ArrowRight", "ArrowLeft", "RefreshCw", "List", "Grid", "PieChart", "BarChart", "DollarSign")
        
        foreach ($icon in $icons) {
            $content = $content -replace "<$icon\s*[^/>]*/>", ""
            $content = $content -replace "<$icon\s*[^>]*>.*?</$icon>", ""
        }
        
        Set-Content $file $content -NoNewline
        Write-Host "Processed $file"
    }
}
