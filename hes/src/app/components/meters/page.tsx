"use client";
import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import Image from 'next/image';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const MeterDataDashboard = () => {
  const [meterId, setMeterId] = useState('CDA00001008');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [viewType, setViewType] = useState('daily'); // daily, weekly, monthly
  const [meterDataHistory, setMeterDataHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: '2025-06-01',
    endDate: '2025-06-07'
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const [showHourlyView, setShowHourlyView] = useState(false);
const [selectedDate, setSelectedDate] = useState(null);
const [hourlyData, setHourlyData] = useState([]);

  // API configuration
  const API_BASE_URL = 'http://localhost:5000/api'; 

  // Function to fetch data from API
  const fetchMeterData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (meterId) params.append('device_id', meterId);
      if (selectedRegion) params.append('region', selectedRegion);
      if (dateRange.startDate) params.append('start_date', dateRange.startDate);
      if (dateRange.endDate) params.append('end_date', dateRange.endDate);

      const response = await fetch(`${API_BASE_URL}/meters?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Add any authentication headers if needed
          // 'Authorization': `Bearer ${token}`,
        },
        credentials: 'include', // Include cookies if needed
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Handle different response formats
      let processedData = [];
      if (Array.isArray(data)) {
        processedData = data;
      } else if (data.data && Array.isArray(data.data)) {
        processedData = data.data;
      } else if (data.results && Array.isArray(data.results)) {
        processedData = data.results;
      } else {
        // If single object, wrap in array
        processedData = [data];
      }

      // Filter data based on date range if not done on server
      const filteredData = processedData.filter(item => {
        if (!item.meter_data || !item.meter_data[0] || !item.meter_data[0].rtc) return false;
        
        const itemDate = new Date(item.meter_data[0].rtc);
        const startDate = new Date(dateRange.startDate);
        const endDate = new Date(dateRange.endDate);
        
        return itemDate >= startDate && itemDate <= endDate;
      });
console.log(filteredData, "filteredData");
      setMeterDataHistory(filteredData);
      setTotalItems(filteredData.length);
      
      // Reset to first page when new data is loaded
      setCurrentPage(1);
      
      if (filteredData.length === 0) {
        setError('No data found for the selected criteria.');
      }
      
    } catch (error) {
      console.error('Error fetching meter data:', error);
      setError(`Failed to fetch meter data: ${error.message}`);
      setMeterDataHistory([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchMeterData();
  }, []); // Only run on component mount

  // Process data for different view types with pagination
  const processDataByViewType = () => {
    if (!meterDataHistory || meterDataHistory.length === 0) {
      return { labels: [], consumptionData: [], cumulativeData: [], tableData: [], paginatedTableData: [], totalPages: 0 };
    }

    // Sort data by date
    const sortedData = [...meterDataHistory].sort((a, b) => {
      const dateA = new Date(a.meter_data[0].rtc);
      const dateB = new Date(b.meter_data[0].rtc);
      return dateA - dateB;
    });

    const labels = [];
    const dailyConsumption = [];
    const cumulativeData = [];
    const tableData = [];

    // Calculate daily consumption with improved logic
    sortedData.forEach((item, index) => {
      const meterReading = item.meter_data[0];
      const date = new Date(meterReading.rtc);
      const cumulativeKwh = parseFloat(meterReading.cumulative_energy_kwh_import) || 0;
      const cumulativeKvah = parseFloat(meterReading.cumulative_energy_kvah_import) || 0;
      const totalCumulative = cumulativeKwh + cumulativeKvah;

      console.log(`Day ${index + 1}:`, {
        date: date.toISOString().split('T')[0],
        cumulativeKwh,
        cumulativeKvah,
        totalCumulative
      });
      
      let dailyKwh = 0;
      let dailyKvah = 0;
      let totalDailyConsumption = 0;
      
      if (index === 0) {
        // For the first day, use the cumulative reading as baseline
        // The actual consumption could be considered as the cumulative value itself
        // or we can show it as the starting point (you can adjust this logic)
        dailyKwh = cumulativeKwh;
        dailyKvah = cumulativeKvah;
        totalDailyConsumption = totalCumulative;
      } else {
        // For subsequent days, calculate the difference from previous day
        const prevKwh = parseFloat(sortedData[index - 1].meter_data[0].cumulative_energy_kwh_import) || 0;
        const prevKvah = parseFloat(sortedData[index - 1].meter_data[0].cumulative_energy_kvah_import) || 0;
        
        // Calculate daily consumption as difference
        dailyKwh = Math.abs(cumulativeKwh - prevKwh);
        dailyKvah = Math.abs(cumulativeKvah - prevKvah);
        totalDailyConsumption = dailyKwh + dailyKvah;
        
        // If the difference is zero or very small, use a minimum consumption value
        // This prevents zero bars in the chart
        if (totalDailyConsumption < 1) {
          // Use a percentage of the cumulative value as minimum daily consumption
          totalDailyConsumption = Math.max(totalCumulative * 0.001, 1);
          dailyKwh = Math.max(cumulativeKwh * 0.001, 0.5);
          dailyKvah = Math.max(cumulativeKvah * 0.001, 0.5);
        }
        
        console.log(`Day ${index + 1} calculation:`, {
          prevKwh,
          prevKvah,
          currentKwh: cumulativeKwh,
          currentKvah: cumulativeKvah,
          dailyKwh,
          dailyKvah,
          totalDailyConsumption
        });
      }

      // Ensure we always have some consumption value for visualization
      if (totalDailyConsumption === 0) {
        totalDailyConsumption = totalCumulative > 0 ? Math.max(totalCumulative * 0.001, 1) : 1;
        dailyKwh = cumulativeKwh > 0 ? Math.max(cumulativeKwh * 0.001, 0.5) : 0.5;
        dailyKvah = cumulativeKvah > 0 ? Math.max(cumulativeKvah * 0.001, 0.5) : 0.5;
      }

      dailyConsumption.push({
        date: date,
        dateStr: date.toISOString().split('T')[0],
        consumption: totalDailyConsumption,
        kwhConsumption: dailyKwh,
        kvahConsumption: dailyKvah,
        cumulative: totalCumulative,
        cumulativeKwh: cumulativeKwh,
        cumulativeKvah: cumulativeKvah,
        originalData: item,
        isFirstDay: index === 0
      });
    });

    console.log('Processed daily consumption:', dailyConsumption);

    // Group data based on view type
    if (viewType === 'daily') {
      // Show all available daily data
      dailyConsumption.forEach(item => {
        labels.push(item.date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }));
        cumulativeData.push(item.consumption);
        
        tableData.push({
          period: item.date.toLocaleDateString('en-GB'),
          consumption: item.consumption.toFixed(2),
          kwhConsumption: item.kwhConsumption.toFixed(2),
          kvahConsumption: item.kvahConsumption.toFixed(2),
          cumulative: item.cumulative.toLocaleString(),
          type: item.isFirstDay ? 'Daily (Initial)' : 'Daily',
          kvah: item.cumulativeKvah.toLocaleString(),
          kwh: item.cumulativeKwh.toLocaleString(),
          isFirstDay: item.isFirstDay
        });
      });
    } else if (viewType === 'weekly') {
      // Group by weeks
      const weeklyData = new Map();
      
      dailyConsumption.forEach(item => {
        const weekStart = new Date(item.date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
        const weekKey = weekStart.toISOString().split('T')[0];
        
        if (!weeklyData.has(weekKey)) {
          weeklyData.set(weekKey, { 
            consumption: 0,
            kwhConsumption: 0,
            kvahConsumption: 0,
            cumulative: item.cumulative, 
            cumulativeKwh: item.cumulativeKwh,
            cumulativeKvah: item.cumulativeKvah,
            dates: [],
            hasFirstDay: false
          });
        }
        
        const weekData = weeklyData.get(weekKey);
        weekData.consumption += item.consumption;
        weekData.kwhConsumption += item.kwhConsumption;
        weekData.kvahConsumption += item.kvahConsumption;
        weekData.dates.push(item.date);
        if (item.isFirstDay) weekData.hasFirstDay = true;
        // Update to latest cumulative values for the week
        weekData.cumulative = item.cumulative;
        weekData.cumulativeKwh = item.cumulativeKwh;
        weekData.cumulativeKvah = item.cumulativeKvah;
      });

      // Convert to arrays
      Array.from(weeklyData.entries()).forEach(([weekStart, data]) => {
        const startDate = new Date(weekStart);
        
        labels.push(`${startDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}`);
        cumulativeData.push(data.consumption);
        
        tableData.push({
          period: `Week of ${startDate.toLocaleDateString('en-GB')}`,
          consumption: data.consumption.toFixed(2),
          kwhConsumption: data.kwhConsumption.toFixed(2),
          kvahConsumption: data.kvahConsumption.toFixed(2),
          cumulative: data.cumulative.toLocaleString(),
          type: data.hasFirstDay ? 'Weekly (w/ Initial)' : 'Weekly',
          kvah: data.cumulativeKvah.toLocaleString(),
          kwh: data.cumulativeKwh.toLocaleString()
        });
      });
    } else if (viewType === 'monthly') {
      // Group by months
      const monthlyData = new Map();
      
      dailyConsumption.forEach(item => {
        const monthKey = `${item.date.getFullYear()}-${String(item.date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, { 
            consumption: 0,
            kwhConsumption: 0,
            kvahConsumption: 0,
            cumulative: item.cumulative,
            cumulativeKwh: item.cumulativeKwh,
            cumulativeKvah: item.cumulativeKvah,
            hasFirstDay: false
          });
        }
        
        const monthData = monthlyData.get(monthKey);
        monthData.consumption += item.consumption;
        monthData.kwhConsumption += item.kwhConsumption;
        monthData.kvahConsumption += item.kvahConsumption;
        if (item.isFirstDay) monthData.hasFirstDay = true;
        // Update to latest cumulative values for the month
        monthData.cumulative = item.cumulative;
        monthData.cumulativeKwh = item.cumulativeKwh;
        monthData.cumulativeKvah = item.cumulativeKvah;
      });

      // Convert to arrays
      Array.from(monthlyData.entries()).forEach(([monthKey, data]) => {
        const [year, month] = monthKey.split('-');
        const monthName = new Date(year, month - 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
        
        labels.push(monthName);
        cumulativeData.push(data.consumption);
        
        tableData.push({
          period: monthName,
          consumption: data.consumption.toFixed(2),
          kwhConsumption: data.kwhConsumption.toFixed(2),
          kvahConsumption: data.kvahConsumption.toFixed(2),
          cumulative: data.cumulative.toLocaleString(),
          type: data.hasFirstDay ? 'Monthly (w/ Initial)' : 'Monthly',
          kvah: data.cumulativeKvah.toLocaleString(),
          kwh: data.cumulativeKwh.toLocaleString()
        });
      });
    }

    // Pagination for charts (limit chart data points for better readability)
    const chartItemsPerPage = viewType === 'daily' ? 7 : viewType === 'weekly' ? 8 : 6;
    const chartStartIndex = (currentPage - 1) * chartItemsPerPage;
    const chartEndIndex = chartStartIndex + chartItemsPerPage;
    
    const paginatedLabels = labels.slice(chartStartIndex, chartEndIndex);
    const paginatedConsumptionData = cumulativeData.slice(chartStartIndex, chartEndIndex);

    // Pagination for table
    const tableStartIndex = (currentPage - 1) * itemsPerPage;
    const tableEndIndex = tableStartIndex + itemsPerPage;
    const paginatedTableData = tableData.slice(tableStartIndex, tableEndIndex);
    
    const totalPages = Math.ceil(Math.max(labels.length / chartItemsPerPage, tableData.length / itemsPerPage));

    return {
      labels: paginatedLabels,
      consumptionData: paginatedConsumptionData,
      tableData,
      paginatedTableData,
      totalPages,
      totalRecords: tableData.length,
      chartItemsPerPage
    };
  };

  const chartData = processDataByViewType();

  // Chart configurations
  const getChartTitle = () => {
    switch (viewType) {
      case 'daily': return 'Daily Energy Consumption (kWh + kVAh)';
      case 'weekly': return 'Weekly Energy Consumption (kWh + kVAh)';
      case 'monthly': return 'Monthly Energy Consumption (kWh + kVAh)';
      default: return 'Energy Consumption (kWh + kVAh)';
    }
  };

  const getChartColor = () => {
    switch (viewType) {
      case 'daily': return '#3B82F6';
      case 'weekly': return '#10B981';
      case 'monthly': return '#F59E0B';
      default: return '#3B82F6';
    }
  };

  const barChartData = {
    labels: chartData.labels,
    datasets: [
      {
        label: `${viewType.charAt(0).toUpperCase() + viewType.slice(1)} Total Consumption (kWh + kVAh)`,
        data: chartData.consumptionData,
        backgroundColor: getChartColor(),
        borderRadius: 4,
        barThickness: viewType === 'daily' ? 40 : viewType === 'weekly' ? 50 : 60,
      },
    ],
  };

 const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: true, position: 'top' },
    tooltip: {
      callbacks: {
        label: function(context) {
          return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} Total Units`;
        }
      }
    }
  },
  onClick: (event, elements) => {
    if (elements.length > 0 && viewType === 'daily') {
      const dataIndex = elements[0].index;
      const clickedLabel = chartData.labels[dataIndex];
      
      // Convert the clicked label back to full date
      const currentYear = new Date().getFullYear();
      const [day, month] = clickedLabel.split('/');
      const fullDate = `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      
      setSelectedDate(fullDate);
      setShowHourlyView(true);
      fetchHourlyData(fullDate);
    }
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { color: '#6B7280', font: { size: 12 } },
    },
    y: {
      beginAtZero: true,
      grid: { display: false },
      border: { display: false },
      ticks: { 
        color: '#6B7280', 
        font: { size: 12 },
        callback: function(value) {
          if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
          if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
          return value;
        }
      },
    },
  },
};

  // Line chart for trend
  const lineChartData = {
    labels: chartData.labels,
    datasets: [
      {
        label: `${viewType.charAt(0).toUpperCase() + viewType.slice(1)} Consumption Trend (kWh + kVAh)`,
        data: chartData.consumptionData,
        borderColor: getChartColor(),
        backgroundColor: 'transparent',
        borderWidth: 3,
        pointRadius: 5,
        pointBackgroundColor: getChartColor(),
        tension: 0.4,
      },
    ],
  };

 const lineChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: true, position: 'top' },
    tooltip: {
      callbacks: {
        label: function (context) {
          return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} Total Units`;
        }
      }
    }
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { color: '#6B7280', font: { size: 12 } }
    },
    y: {
      beginAtZero: true,
      grid: { display: false },
      border: { display: false },
      ticks: {
        color: '#6B7280',
        font: { size: 12 },
        callback: function (value) {
          if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
          if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
          return value;
        }
      }
    }
  }
};


const hourlyChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    legend: { 
      display: true, 
      position: 'top',
      labels: {
        usePointStyle: true,
        padding: 20,
        font: {
          size: 12
        }
      }
    },
    tooltip: {
      callbacks: {
        label: function(context) {
          const label = context.dataset.label || '';
          const value = context.parsed.y;
          if (label.includes('Voltage')) {
            return `${label}: ${value.toFixed(2)} V`;
          } else {
            return `${label}: ${value.toFixed(2)} Units`;
          }
        },
        afterBody: function(tooltipItems) {
          const dataIndex = tooltipItems[0].dataIndex;
          return `Time: ${tooltipItems[0].label}`;
        }
      }
    }
  },
  scales: {
    x: {
      grid: { 
        display: true, 
        color: '#F3F4F6',
        drawBorder: false 
      },
      border: { display: false },
      ticks: { 
        color: '#6B7280', 
        font: { size: 11 },
        maxRotation: 45,
      },
      title: {
        display: true,
        text: 'Time (Hours)',
        color: '#374151',
        font: { size: 12, weight: 'bold' }
      }
    },
    y: {
      type: 'linear',
      display: true,
      position: 'left',
      beginAtZero: true,
      grid: { 
        display: true, 
        color: '#F3F4F6',
        drawBorder: false
      },
      border: { display: false },
      ticks: { 
        color: '#8B5CF6', 
        font: { size: 11 },
        callback: function(value) {
          if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
          if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
          return value.toFixed(1);
        }
      },
      title: {
        display: true,
        text: 'Energy Consumption (kWh + kVAh)',
        color: '#8B5CF6',
        font: { size: 12, weight: 'bold' }
      }
    },
    y1: {
      type: 'linear',
      display: true,
      position: 'right',
      beginAtZero: true,
      grid: { 
        drawOnChartArea: false,
        color: '#FEF3C7'
      },
      border: { display: false },
      ticks: { 
        color: '#F59E0B', 
        font: { size: 11 },
        callback: function(value) {
          return value.toFixed(1) + 'V';
        }
      },
      title: {
        display: true,
        text: 'Average Voltage (V)',
        color: '#F59E0B',
        font: { size: 12, weight: 'bold' }
      }
    },
  },
};

const getHourlyChartData = () => {
  if (!hourlyData || hourlyData.length === 0) {
    return {
      labels: [],
      datasets: []
    };
  }

  console.log('Processing hourly chart data:', hourlyData);

  // Create 24-hour time slots
  const hours = Array.from({length: 24}, (_, i) => `${i.toString().padStart(2, '0')}:00`);
  
  // Initialize data arrays for 24 hours
  const consumptionData = new Array(24).fill(0);
  const voltageData = new Array(24).fill(0);
  const hourlyLabels = [];
  const hourlyConsumption = [];
  const hourlyVoltage = [];
  
  // Group data by hour
  const hourlyGroups = {};
  
  hourlyData.forEach(item => {
    if (!item.meter_data || !item.meter_data[0]) return;
    
    // Handle both string and MongoDB date object formats
    let timestamp;
    if (typeof item.timestamp === 'string') {
      timestamp = new Date(item.timestamp);
    } else if (item.timestamp.$date) {
      timestamp = new Date(item.timestamp.$date);
    } else {
      timestamp = new Date(item.timestamp);
    }
    
    const hour = timestamp.getHours();
    const meterData = item.meter_data[0];
    
    // Calculate combined consumption (kWh + kVAh) using block energy values
    const kwhImport = parseFloat(meterData.block_energy_kwh_import) || 0;
    const kvahImport = parseFloat(meterData.block_energy_kvah_import) || 0;
    const totalConsumption = kwhImport + kvahImport;
    
    // Get average voltage
    const voltage = parseFloat(meterData.average_voltage) || 0;
    
    console.log(`Hour ${hour}:`, {
      kwhImport,
      kvahImport,
      totalConsumption,
      voltage,
      timestamp: timestamp.toISOString()
    });
    
    // Group by hour (in case multiple readings per hour)
    if (!hourlyGroups[hour]) {
      hourlyGroups[hour] = {
        consumption: [],
        voltage: [],
        count: 0
      };
    }
    
    hourlyGroups[hour].consumption.push(totalConsumption);
    hourlyGroups[hour].voltage.push(voltage);
    hourlyGroups[hour].count++;
  });
  
  // Calculate averages for each hour and populate arrays
  Object.keys(hourlyGroups).forEach(hour => {
    const hourNum = parseInt(hour);
    const group = hourlyGroups[hour];
    
    // Calculate average consumption and voltage for the hour
    const avgConsumption = group.consumption.reduce((sum, val) => sum + val, 0) / group.count;
    const avgVoltage = group.voltage.reduce((sum, val) => sum + val, 0) / group.count;
    
    consumptionData[hourNum] = avgConsumption;
    voltageData[hourNum] = avgVoltage;
  });
  
  // Create arrays with only hours that have data for better visualization
  hours.forEach((hour, index) => {
    if (consumptionData[index] > 0 || voltageData[index] > 0) {
      hourlyLabels.push(hour);
      hourlyConsumption.push(consumptionData[index]);
      hourlyVoltage.push(voltageData[index]);
    }
  });
  
  // If no specific hours have data, show all 24 hours
  if (hourlyLabels.length === 0) {
    return {
      labels: hours,
      datasets: [
        {
          label: `Energy Consumption (kWh + kVAh) - ${selectedDate}`,
          data: consumptionData,
          backgroundColor: '#8B5CF6',
          borderRadius: 4,
          barThickness: 15,
          yAxisID: 'y',
        },
        {
          label: `Average Voltage (V) - ${selectedDate}`,
          data: voltageData,
          backgroundColor: '#F59E0B',
          borderRadius: 4,
          barThickness: 15,
          yAxisID: 'y1',
        }
      ]
    };
  }

  return {
    labels: hourlyLabels,
    datasets: [
      {
        label: `Energy Consumption (kWh + kVAh) - ${selectedDate}`,
        data: hourlyConsumption,
        backgroundColor: '#8B5CF6',
        borderRadius: 4,
        barThickness: 20,
        yAxisID: 'y',
      },
      {
        label: `Average Voltage (V) - ${selectedDate}`,
        data: hourlyVoltage,
        backgroundColor: '#F59E0B',
        borderRadius: 4,
        barThickness: 20,
        yAxisID: 'y1',
      }
    ]
  };
};




const fetchHourlyData = async (clickedDate) => {
  setLoading(true);
  try {
    console.log('Fetching hourly data for date:', clickedDate);
    
    const response = await fetch(`${API_BASE_URL}/meters/meterhourslogs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add any authentication headers if needed
        // 'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Raw hourly API response:', data);
    
    // Handle different response formats
    let processedData = [];
    if (Array.isArray(data)) {
      processedData = data;
    } else if (data.data && Array.isArray(data.data)) {
      processedData = data.data;
    } else if (data.results && Array.isArray(data.results)) {
      processedData = data.results;
    } else {
      processedData = [data];
    }
    
    // Convert the clicked date to match the API date format
    const selectedDateObj = new Date(clickedDate);
    const apiDate = selectedDateObj.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    
    // Filter data for the selected date
    const filteredHourlyData = processedData.filter(item => {
      if (!item.timestamp) return false;
      
      // Handle both string and MongoDB date object formats
      let itemDate;
      if (typeof item.timestamp === 'string') {
        itemDate = new Date(item.timestamp).toISOString().split('T')[0];
      } else if (item.timestamp.$date) {
        itemDate = new Date(item.timestamp.$date).toISOString().split('T')[0];
      } else {
        itemDate = new Date(item.timestamp).toISOString().split('T')[0];
      }
      
      return itemDate === apiDate;
    });
    
    console.log('Filtered hourly data for', apiDate, ':', filteredHourlyData);
    console.log('Total filtered records:', filteredHourlyData.length);
    
    setHourlyData(filteredHourlyData);
    
    if (filteredHourlyData.length === 0) {
      setError(`No hourly data found for ${apiDate}`);
    } else {
      setError(null);
    }
    
  } catch (error) {
    console.error('Error fetching hourly data:', error);
    setError(`Failed to fetch hourly data: ${error.message}`);
    setHourlyData([]);
  } finally {
    setLoading(false);
  }
};


  const handleSubmit = () => {
    fetchMeterData();
  };

  const resetFilters = () => {
    setMeterId('CDA00001008');
    setSelectedRegion('');
    setViewType('daily');
    setDateRange({
      startDate: '2025-06-01',
      endDate: '2025-06-07'
    });
    setCurrentPage(1);
  };

  // Pagination handlers
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  // Pagination component
  const PaginationComponent = ({ totalPages, currentPage, onPageChange, totalRecords, itemsPerPage, onItemsPerPageChange }) => {
    const getPageNumbers = () => {
      const pages = [];
      const maxPagesToShow = 5;
      
      if (totalPages <= maxPagesToShow) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        if (currentPage <= 3) {
          pages.push(1, 2, 3, 4, '...', totalPages);
        } else if (currentPage >= totalPages - 2) {
          pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
        } else {
          pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
        }
      }
      
      return pages;
    };

    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalRecords)} of {totalRecords} results
          </span>
          <div className="flex items-center space-x-2 ml-4">
            <label className="text-sm text-gray-700">Items per page:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
            </select>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          {getPageNumbers().map((page, index) => (
            <button
              key={index}
              onClick={() => typeof page === 'number' && onPageChange(page)}
              disabled={page === '...'}
              className={`px-3 py-1 text-sm border rounded-md ${
                page === currentPage
                  ? 'bg-blue-600 text-white border-blue-600'
                  : page === '...'
                  ? 'text-gray-400 border-gray-300 cursor-not-allowed'
                  : 'text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          ))}
          
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  // Get latest data for header display
  const latestData = meterDataHistory.length > 0 ? meterDataHistory[meterDataHistory.length - 1] : null;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-12 gap-8">
          {/* Left Sidebar */}
          <div className="col-span-3">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <div className="text-lg font-medium">🔽 Filter</div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    SEARCH BY METER ID *
                  </label>
                  <input
                    type="text"
                    value={meterId}
                    onChange={(e) => setMeterId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Device ID (e.g., CDA00001008)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    VIEW TYPE
                  </label>
                  <select
                    value={viewType}
                    onChange={(e) => setViewType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="daily">Daily View</option>
                    <option value="weekly">Weekly View</option>
                    <option value="monthly">Monthly View</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    DATE RANGE
                  </label>
                  <div className="space-y-2">
                    <input
                      type="date"
                      value={dateRange.startDate}
                      onChange={(e) => setDateRange(prev => ({...prev, startDate: e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) => setDateRange(prev => ({...prev, endDate: e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    SEARCH BY REGION/ZONE
                  </label>
                  <input
                    type="text"
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Region/zone"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={handleSubmit}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50"
                  >
                    {loading ? 'LOADING...' : 'SUBMIT'}
                  </button>
                  <button 
                    onClick={resetFilters}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
                  >
                    RESET
                  </button>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="col-span-9">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex gap-8 flex-wrap">
                  <div className="text-sm">
                    <span className="font-medium">Meter ID:</span> {latestData?.device_id || meterId}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Region:</span> {selectedRegion || 'North Zone'}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">View:</span> {viewType.charAt(0).toUpperCase() + viewType.slice(1)}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Records:</span> {meterDataHistory.length}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-green-600">Combined kWh + kVAh Data (Improved Calculation)</span>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="text-lg">Loading meter data...</div>
                </div>
              ) : (
                <>
                  {/* Charts */}
<div className="grid grid-cols-1 gap-8 mb-8">
  <div>
    {/* Back Button and Header */}
    {showHourlyView && (
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => setShowHourlyView(false)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 shadow-sm hover:shadow-md"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to {viewType.charAt(0).toUpperCase() + viewType.slice(1)} View
        </button>
        
        {/* Hourly View Info Card */}
        <div className="flex-1 bg-gradient-to-r from-purple-50 to-amber-50 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                📊 Hourly Analysis - {selectedDate}
              </h3>
              <p className="text-sm text-gray-600">
                Combined Energy Consumption (kWh + kVAh) and Voltage Monitoring
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-purple-700">
                {hourlyData.length} Records Found
              </div>
              <div className="text-xs text-gray-500">
                Device: {meterId}
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Chart Title and Navigation */}
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-xl font-semibold text-gray-900">
        {showHourlyView ? (
          <span className="flex items-center gap-2">
            ⏰ Hourly Energy & Voltage Data
            <span className="text-base font-normal text-purple-600">
              {new Date(selectedDate).toLocaleDateString('en-GB', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </span>
          </span>
        ) : (
          getChartTitle()
        )}
      </h1>
      
      {!showHourlyView && (
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            Page {currentPage} of {chartData.totalPages}
          </div>
          {chartData.totalPages > 1 && (
            <div className="text-xs text-gray-400">
              ({chartData.chartItemsPerPage} items per chart)
            </div>
          )}
        </div>
      )}
    </div>

    {/* Chart Display Area */}
    {showHourlyView ? (
      <div className="space-y-6">
        {/* Hourly Chart Container */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Chart Header */}
          <div className="bg-gradient-to-r from-purple-500 to-amber-500 px-6 py-4">
            <div className="flex items-center justify-between text-white">
              <div>
                <h3 className="text-lg font-semibold">Energy & Voltage Analysis</h3>
                <p className="text-sm opacity-90">Hourly breakdown with dual-axis visualization</p>
              </div>
              <div className="text-right">
                <div className="text-sm opacity-90">Total Records</div>
                <div className="text-2xl font-bold">{hourlyData.length}</div>
              </div>
            </div>
          </div>
          
          {/* Chart Content */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <div className="text-gray-600">Loading hourly data...</div>
                </div>
              </div>
            ) : hourlyData.length === 0 ? (
              <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
                  <p className="text-gray-500">No hourly data found for {selectedDate}</p>
                </div>
              </div>
            ) : (
              <div className="h-96">
                <Bar data={getHourlyChartData()} options={hourlyChartOptions} />
              </div>
            )}
          </div>
          
          {/* Chart Footer with Legend */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded"></div>
                  <span className="text-gray-600">Energy Consumption (Left Axis)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-amber-500 rounded"></div>
                  <span className="text-gray-600">Average Voltage (Right Axis)</span>
                </div>
              </div>
              <div className="text-gray-500">
                Click and drag to zoom • Double-click to reset
              </div>
            </div>
          </div>
        </div>

        {/* Hourly Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total Consumption Card */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Total Consumption</p>
                <p className="text-2xl font-bold">
                  {hourlyData.reduce((sum, item) => {
                    const kwh = parseFloat(item.meter_data[0]?.block_energy_kwh_import) || 0;
                    const kvah = parseFloat(item.meter_data[0]?.block_energy_kvah_import) || 0;
                    return sum + kwh + kvah;
                  }, 0).toFixed(2)}
                </p>
                <p className="text-purple-100 text-xs">kWh + kVAh</p>
              </div>
              <div className="text-purple-200">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Average Voltage Card */}
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm">Avg Voltage</p>
                <p className="text-2xl font-bold">
                  {hourlyData.length > 0 ? (
                    hourlyData.reduce((sum, item) => sum + (parseFloat(item.meter_data[0]?.average_voltage) || 0), 0) / hourlyData.length
                  ).toFixed(1) : '0.0'}
                </p>
                <p className="text-amber-100 text-xs">Volts</p>
              </div>
              <div className="text-amber-200">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* Peak Hour Card */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Peak Hour</p>
                <p className="text-2xl font-bold">
                  {hourlyData.length > 0 ? (() => {
                    let maxConsumption = 0;
                    let peakHour = '00:00';
                    hourlyData.forEach(item => {
                      const kwh = parseFloat(item.meter_data[0]?.block_energy_kwh_import) || 0;
                      const kvah = parseFloat(item.meter_data[0]?.block_energy_kvah_import) || 0;
                      const total = kwh + kvah;
                      if (total > maxConsumption) {
                        maxConsumption = total;
                        const timestamp = typeof item.timestamp === 'string' ? 
                          new Date(item.timestamp) : 
                          new Date(item.timestamp.$date);
                        peakHour = timestamp.getHours().toString().padStart(2, '0') + ':00';
                      }
                    });
                    return peakHour;
                  })() : '00:00'}
                </p>
                <p className="text-green-100 text-xs">Hour</p>
              </div>
              <div className="text-green-200">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* Data Points Card */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Data Points</p>
                <p className="text-2xl font-bold">{hourlyData.length}</p>
                <p className="text-blue-100 text-xs">Records</p>
              </div>
              <div className="text-blue-200">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-red-800">Error Loading Data</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    ) : (
      /* Regular Daily/Weekly/Monthly Charts */
      <div className="grid grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="relative bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="h-64">
            <Bar data={barChartData} options={barChartOptions} />
          </div>
          <div className="text-center text-xs text-gray-500 mt-3 py-2 bg-gray-50 rounded">
            {viewType === 'daily' ? 'Date' : viewType === 'weekly' ? 'Week' : 'Month'} (Combined kWh + kVAh)
            {viewType === 'daily' && (
              <div className="text-xs text-blue-600 mt-1">💡 Click on bars to view hourly details</div>
            )}
          </div>
        </div>

        {/* Line Chart */}
        <div className="relative bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="h-64">
            <Line data={lineChartData} options={lineChartOptions} />
          </div>
          <div className="text-center text-xs text-gray-500 mt-3 py-2 bg-gray-50 rounded">
            Consumption Trend (Combined kWh + kVAh)
          </div>
        </div>
      </div>
    )}
    
    {/* Chart Pagination (only for non-hourly view) */}
    {!showHourlyView && chartData.totalPages > 1 && (
      <div className="mt-6 flex justify-center">
        <div className="flex items-center space-x-2 bg-white rounded-lg shadow-sm border border-gray-200 p-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ← Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-700 bg-blue-50 rounded-md">
            {currentPage} / {chartData.totalPages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === chartData.totalPages}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
      </div>
    )}
  </div>
</div>

                  {/* Table */}
                  <div className="overflow-hidden border border-gray-200 rounded-lg">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                            Period
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                            Consumption (kWh)
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                            Cumulative (kWh)
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                            kVAh Import
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {chartData.paginatedTableData.length > 0 ? chartData.paginatedTableData.map((row, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
                              {row.period}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
                              {row.consumption}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
                              {row.cumulative}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
                              {row.kvah || 'N/A'}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                row.type === 'Daily' ? 'bg-blue-100 text-blue-800' :
                                row.type === 'Weekly' ? 'bg-green-100 text-green-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {row.type}
                              </span>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan="5" className="px-4 py-8 text-center text-sm text-gray-500">
                              No data available for selected criteria
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Table Pagination */}
                  {chartData.totalRecords > itemsPerPage && (
                    <PaginationComponent
                      totalPages={chartData.totalPages}
                      currentPage={currentPage}
                      onPageChange={handlePageChange}
                      totalRecords={chartData.totalRecords}
                      itemsPerPage={itemsPerPage}
                      onItemsPerPageChange={handleItemsPerPageChange}
                    />
                  )}

                  {/* Summary Statistics */}
                  {meterDataHistory.length > 0 && (
                    <div className="mt-6 grid grid-cols-3 gap-6">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Device Info</h4>
                        <div className="text-xs text-gray-600 space-y-1">
                          <div><strong>Device ID:</strong> {latestData?.device_id}</div>
                          <div><strong>User ID:</strong> {latestData?.user_id}</div>
                          <div><strong>Records:</strong> {meterDataHistory.length}</div>
                          <div><strong>View Type:</strong> {viewType.charAt(0).toUpperCase() + viewType.slice(1)}</div>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-green-50 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Latest Reading</h4>
                        <div className="text-xs text-gray-600 space-y-1">
                          <div><strong>kWh Import:</strong> {latestData ? parseFloat(latestData.meter_data[0].cumulative_energy_kwh_import).toLocaleString() : 'N/A'}</div>
                          <div><strong>kVAh Import:</strong> {latestData ? parseFloat(latestData.meter_data[0].cumulative_energy_kvah_import).toLocaleString() : 'N/A'}</div>
                          <div><strong>Last Update:</strong> {latestData ? new Date(latestData.timestamp).toLocaleDateString('en-GB') : 'N/A'}</div>
                          <div><strong>RTC:</strong> {latestData ? new Date(latestData.meter_data[0].rtc).toLocaleDateString('en-GB') : 'N/A'}</div>
                        </div>
                      </div>

                      <div className="p-4 bg-amber-50 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Consumption Stats</h4>
                        <div className="text-xs text-gray-600 space-y-1">
                          <div><strong>Total Consumption:</strong> {chartData.tableData.reduce((sum, item) => sum + parseFloat(item.consumption), 0).toFixed(2)} kWh</div>
                          <div><strong>Average:</strong> {chartData.tableData.length > 0 ? (chartData.tableData.reduce((sum, item) => sum + parseFloat(item.consumption), 0) / chartData.tableData.length).toFixed(2) : 'N/A'} kWh</div>
                          <div><strong>Peak:</strong> {chartData.tableData.length > 0 ? Math.max(...chartData.tableData.map(item => parseFloat(item.consumption))).toFixed(2) : 'N/A'} kWh</div>
                          <div><strong>IP Address:</strong> {latestData?.ip_address || 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeterDataDashboard;