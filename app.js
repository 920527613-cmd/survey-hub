// Global Variables
let currentSheet = '';
let allSheets = {};
let originalData = [];
let currentData = [];
let charts = {};

// File Upload Handler
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx')) {
        showMessage('❌ 请上传 .xlsx 格式的 Excel 文件', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            allSheets = {};
            Object.keys(workbook.Sheets).forEach(sheetName => {
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
                allSheets[sheetName] = jsonData;
            });

            // Initialize with first sheet
            currentSheet = Object.keys(allSheets)[0];
            loadSheet(currentSheet);
            
            // Update UI
            document.getElementById('initialEmpty').style.display = 'none';
            document.getElementById('analysisSection').style.display = 'block';
            
            // Populate sheet selector
            updateSheetSelector();
            showMessage(`✅ 成功加载 ${Object.keys(allSheets).length} 个工作表`, 'success');
        } catch (error) {
            showMessage('❌ 文件解析失败，请检查文件格式', 'error');
            console.error('Error:', error);
        }
    };
    reader.readAsArrayBuffer(file);
}

// Show Message
function showMessage(message, type) {
    const messageArea = document.getElementById('messageArea');
    messageArea.innerHTML = `<div class="${type}-message">${message}</div>`;
    setTimeout(() => {
        messageArea.innerHTML = '';
    }, 5000);
}

// Load Sheet Data
function loadSheet(sheetName) {
    currentSheet = sheetName;
    originalData = JSON.parse(JSON.stringify(allSheets[sheetName] || []));
    currentData = JSON.parse(JSON.stringify(originalData));
    
    // Reset search
    document.getElementById('searchInput').value = '';
    
    // Render table
    renderTable();
    
    // Update axis selectors
    updateAxisSelectors();
    
    // Generate charts
    updateCharts();
}

// Switch Sheet
function switchSheet(sheetName) {
    if (sheetName) {
        loadSheet(sheetName);
    }
}

// Update Sheet Selector
function updateSheetSelector() {
    const select = document.getElementById('sheetSelect');
    select.innerHTML = '<option value="">-- 请选择 --</option>';
    
    Object.keys(allSheets).forEach(sheetName => {
        const option = document.createElement('option');
        option.value = sheetName;
        option.textContent = sheetName;
        select.appendChild(option);
    });
    
    select.value = currentSheet;
}

// Update Axis Selectors
function updateAxisSelectors() {
    const columns = originalData.length > 0 ? Object.keys(originalData[0]) : [];
    
    const xAxisSelect = document.getElementById('xAxisSelect');
    const yAxisSelect = document.getElementById('yAxisSelect');
    
    // Store current selections
    const currentX = xAxisSelect.value;
    const currentY = yAxisSelect.value;
    
    // Rebuild options
    xAxisSelect.innerHTML = '<option value="">-- 自动 --</option>';
    yAxisSelect.innerHTML = '<option value="">-- 自动 --</option>';
    
    columns.forEach(col => {
        const optionX = document.createElement('option');
        optionX.value = col;
        optionX.textContent = col;
        xAxisSelect.appendChild(optionX);
        
        const optionY = document.createElement('option');
        optionY.value = col;
        optionY.textContent = col;
        yAxisSelect.appendChild(optionY);
    });
    
    // Restore selections if valid
    xAxisSelect.value = currentX;
    yAxisSelect.value = currentY;
}

// Render Table
function renderTable() {
    const table = document.getElementById('dataTable');
    const emptyTable = document.getElementById('emptyTable');
    
    if (currentData.length === 0) {
        table.style.display = 'none';
        emptyTable.style.display = 'block';
        return;
    }
    
    table.style.display = '';
    emptyTable.style.display = 'none';
    
    const columns = Object.keys(currentData[0] || {});
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    
    // Header
    thead.innerHTML = `<tr>${columns.map(col => `<th>${col}</th>`).join('')}</tr>`;
    
    // Body
    tbody.innerHTML = currentData.map(row => 
        `<tr>${columns.map(col => `<td>${row[col] ?? ''}</td>`).join('')}</tr>`
    ).join('');
}

// Filter Table
function filterTable() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    
    if (!searchTerm) {
        currentData = JSON.parse(JSON.stringify(originalData));
    } else {
        currentData = originalData.filter(row => {
            return Object.values(row).some(val => 
                String(val).toLowerCase().includes(searchTerm)
            );
        });
    }
    
    renderTable();
}

// Update Charts
function updateCharts() {
    const chartsGrid = document.getElementById('chartsGrid');
    chartsGrid.innerHTML = '';
    
    if (currentData.length === 0) {
        chartsGrid.innerHTML = '<div class="empty-state"><p>暂无数据，无法生成图表</p></div>';
        return;
    }
    
    // Auto-detect numeric and category columns
    const columns = Object.keys(currentData[0] || {});
    const numericCols = detectNumericColumns(currentData, columns);
    const categoryCol = document.getElementById('xAxisSelect').value || columns.find(col => !numericCols.includes(col));
    const valueCol = document.getElementById('yAxisSelect').value || numericCols[0];
    
    if (!categoryCol || !valueCol || categoryCol === valueCol) {
        chartsGrid.innerHTML = '<div class="empty-state"><p>请选择不同的 X 轴和 Y 轴列</p></div>';
        return;
    }
    
    // Create three types of charts
    createChartCard('bar', categoryCol, valueCol, chartsGrid);
    createChartCard('line', categoryCol, valueCol, chartsGrid);
    createChartCard('pie', categoryCol, valueCol, chartsGrid);
}

// Detect Numeric Columns
function detectNumericColumns(data, columns) {
    return columns.filter(col => {
        const sample = data.slice(0, 10);
        return sample.every(row => !isNaN(row[col]) && row[col] !== '');
    });
}

// Create Chart Card
function createChartCard(type, categoryCol, valueCol, container) {
    const chartType = {
        'bar': '柱状图',
        'line': '折线图',
        'pie': '饼图'
    }[type];
    
    const card = document.createElement('div');
    card.className = 'chart-card';
    
    const chartId = `chart-${type}-${Date.now()}`;
    
    card.innerHTML = `
        <h3>${chartType} - ${categoryCol} vs ${valueCol}</h3>
        <div class="chart-controls">
            <button class="chart-btn" onclick="downloadChart('${chartId}', '${chartType}')">💾 下载 PNG</button>
        </div>
        <div class="chart-container" id="${chartId}"></div>
    `;
    
    container.appendChild(card);
    
    // Generate chart
    const chartData = aggregateData(currentData, categoryCol, valueCol);
    const option = generateChartOption(type, chartData, categoryCol, valueCol);
    
    const chartInstance = echarts.init(document.getElementById(chartId));
    chartInstance.setOption(option);
    charts[chartId] = chartInstance;
    
    // Store for resize
    window.addEventListener('resize', () => {
        if (charts[chartId]) {
            charts[chartId].resize();
        }
    });
}

// Aggregate Data
function aggregateData(data, categoryCol, valueCol) {
    const aggregated = {};
    
    data.forEach(row => {
        const category = String(row[categoryCol] || 'Unknown');
        const value = parseFloat(row[valueCol]) || 0;
        
        aggregated[category] = (aggregated[category] || 0) + value;
    });
    
    return Object.entries(aggregated).map(([name, value]) => ({
        name,
        value
    }));
}

// Generate Chart Option
function generateChartOption(type, data, categoryCol, valueCol) {
    const categories = data.map(item => item.name);
    const values = data.map(item => item.value);
    
    const baseOption = {
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(50, 50, 50, 0.9)',
            borderColor: '#333',
            textStyle: { color: '#fff' }
        },
        grid: {
            left: '12%',
            right: '12%',
            bottom: '15%',
            top: '10%',
            containLabel: true
        },
        textStyle: {
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto'
        }
    };
    
    if (type === 'bar') {
        return {
            ...baseOption,
            xAxis: {
                type: 'category',
                data: categories,
                axisLabel: { rotate: 45, interval: 0 }
            },
            yAxis: { type: 'value' },
            series: [{
                data: values,
                type: 'bar',
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: '#667eea' },
                        { offset: 1, color: '#764ba2' }
                    ])
                },
                smooth: true
            }]
        };
    } else if (type === 'line') {
        return {
            ...baseOption,
            xAxis: {
                type: 'category',
                data: categories,
                axisLabel: { rotate: 45 }
            },
            yAxis: { type: 'value' },
            series: [{
                data: values,
                type: 'line',
                smooth: true,
                itemStyle: { color: '#667eea' },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(102, 126, 234, 0.5)' },
                        { offset: 1, color: 'rgba(102, 126, 234, 0.1)' }
                    ])
                }
            }]
        };
    } else if (type === 'pie') {
        return {
            ...baseOption,
            tooltip: { trigger: 'item' },
            series: [{
                name: valueCol,
                type: 'pie',
                radius: ['35%', '60%'],
                data: data,
                itemStyle: {
                    borderRadius: 8,
                    borderColor: '#fff',
                    borderWidth: 2
                }
            }]
        };
    }
}

// Download Chart as PNG
function downloadChart(chartId, chartType) {
    const chart = charts[chartId];
    if (!chart) return;
    
    const url = chart.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#fff'
    });
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${chartType}-${new Date().getTime()}.png`;
    link.click();
}

// Export PDF - Fixed version
async function exportPDF() {
    showMessage('⏳ 正在生成 PDF 报告，请稍候...', 'success');
    
    const element = document.querySelector('.content');
    const container = document.createElement('div');
    container.style.background = '#fff';
    container.style.padding = '20px';
    
    // Clone the content
    const clone = element.cloneNode(true);
    
    // Remove unwanted elements
    clone.querySelectorAll('.upload-area, .controls, .search-bar, .export-section, .section-title').forEach(el => el.remove());
    
    // Convert charts to images before PDF export
    const chartContainers = clone.querySelectorAll('[id^="chart-"]');
    for (let chartContainer of chartContainers) {
        const chartId = chartContainer.id;
        const chart = charts[chartId];
        
        if (chart) {
            try {
                const imageUrl = chart.getDataURL({
                    type: 'png',
                    pixelRatio: 2,
                    backgroundColor: '#fff'
                });
                
                // Create image element
                const img = document.createElement('img');
                img.src = imageUrl;
                img.style.width = '100%';
                img.style.maxWidth = '800px';
                img.style.height = 'auto';
                img.style.margin = '10px 0';
                
                // Replace chart container with image
                chartContainer.parentNode.replaceChild(img, chartContainer);
            } catch (e) {
                console.warn('Chart export failed:', e);
            }
        }
    }
    
    container.appendChild(clone);
    document.body.appendChild(container);
    
    // Give time for images to load
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const opt = {
        margin: [10, 10, 10, 10],
        filename: `数据分析报告-${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'png', quality: 0.98 },
        html2canvas: { 
            scale: 2, 
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff'
        },
        jsPDF: { 
            orientation: 'p',
            unit: 'mm', 
            format: 'a4'
        }
    };
    
    try {
        await html2pdf().set(opt).from(container).save();
        showMessage('✅ PDF 报告已导出成功！', 'success');
    } catch (error) {
        showMessage('❌ PDF 导出失败，请重试', 'error');
        console.error('PDF export error:', error);
    } finally {
        // Clean up
        document.body.removeChild(container);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Setup drag and drop
    const uploadArea = document.querySelector('.upload-area');
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#764ba2';
        uploadArea.style.background = '#f0f2ff';
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '#667eea';
        uploadArea.style.background = '#f8f9ff';
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#667eea';
        uploadArea.style.background = '#f8f9ff';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            document.getElementById('fileInput').files = files;
            handleFileUpload({ target: { files } });
        }
    });
});
