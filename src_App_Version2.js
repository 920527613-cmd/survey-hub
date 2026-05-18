import React, { useState } from "react";
import Papa from "papaparse";
import * as echarts from "echarts";

function statCol(arr, key) {
  const map = {};
  arr.forEach((row) => {
    const v = row[key] || "未填写";
    map[v] = (map[v] || 0) + 1;
  });
  return map;
}

export default function App() {
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [col, setCol] = useState("");
  const [chartType, setChartType] = useState("bar");

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        setHeaders(results.meta.fields || []);
        setRows(results.data.filter(r => Object.values(r).some(x => x)));
      }
    });
  }

  React.useEffect(() => {
    if (!col || !rows.length) return;
    const data = statCol(rows, col);
    const chartDom = document.getElementById("chart");
    if (!chartDom) return;
    const chart = echarts.getInstanceByDom(chartDom) || echarts.init(chartDom);
    if (chartType === "bar") {
      chart.setOption({
        title: { text: `${col} 分布` },
        xAxis: { data: Object.keys(data) },
        yAxis: {},
        series: [{ type: "bar", data: Object.values(data) }]
      });
    } else {
      chart.setOption({
        title: { text: `${col} 分布` },
        tooltip: {},
        series: [{
          type: "pie",
          data: Object.entries(data).map(([k, v]) => ({ name: k, value: v }))
        }]
      });
    }
  }, [col, rows, chartType]);

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h2>简易数据分析与统计可视化工具</h2>
      <p>1. 选择或拖拽 <b>CSV 文件</b>（如姓名、年龄、性别等字段的表格）进行分析。</p>
      <input type="file" accept=".csv" onChange={handleFile} />
      {rows.length > 0 && (
        <>
          <div style={{ margin: "24px 0" }}>
            <label>
              统计字段:
              <select value={col} onChange={e => setCol(e.target.value)}>
                <option value="">请选择</option>
                {headers.map(h => <option value={h} key={h}>{h}</option>)}
              </select>
            </label>
            <label style={{ marginLeft: 32 }}>
              图表类型:
              <select value={chartType} onChange={e => setChartType(e.target.value)}>
                <option value="bar">柱状图</option>
                <option value="pie">饼图</option>
              </select>
            </label>
          </div>
          <div
            id="chart"
            style={{ width: 500, height: 340, border: "1px solid #ccc", marginBottom: 24 }}
          ></div>
          <h4>原始数据：</h4>
          <div style={{ maxHeight: 260, overflow: "auto", border: "1px solid #eee" }}>
            <table border="1" cellPadding={4} style={{ borderCollapse: "collapse", minWidth: "500px" }}>
              <thead>
                <tr>
                  {headers.map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    {headers.map(h => <td key={h}>{row[h]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <div style={{ color: "#888", marginTop: 40, fontSize: 14 }}>
        <p>数据解析仅在浏览器本地，不上传服务器，适合小型调研、三下乡问卷快速分析。<br/>支持 Excel 导出为 CSV 格式后直接上传。</p>
      </div>
    </div>
  );
}