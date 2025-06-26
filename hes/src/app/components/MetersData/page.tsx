"use client";
import React, { useState, useEffect } from "react";
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
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import Image from "next/image";

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

interface MeterData {
  meter_data: {
    cumulative_energy_kwh_import: string;
    cumulative_energy_kvah_import: string;
    rtc: Date;
  }[];
}

const MeterDataDashboard = () => {
  const [meterId, setMeterId] = useState("CDA00001008");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [viewType, setViewType] = useState("daily"); // daily, weekly, monthly
  const [meterDataHistory, setMeterDataHistory] = useState<MeterData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [dateRange, setDateRange] = useState({
    startDate: "2025-06-01",
    endDate: "2025-06-07",
  });

  console.log(meterDataHistory, "meterDataHistory");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const [showHourlyView, setShowHourlyView] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [hourlyData, setHourlyData] = useState<any>([]);

  // API configuration
  const API_BASE_URL = "http://localhost:5000/api";

  // Function to fetch data from API
  const fetchMeterData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (meterId) params.append("device_id", meterId);
      if (selectedRegion) params.append("region", selectedRegion);
      if (dateRange.startDate) params.append("start_date", dateRange.startDate);
      if (dateRange.endDate) params.append("end_date", dateRange.endDate);

      const response = await fetch(
        `${API_BASE_URL}/meters?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            // Add any authentication headers if needed
            // 'Authorization': `Bearer ${token}`,
          },
          credentials: "include", // Include cookies if needed
        }
      );

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
      const filteredData = processedData.filter(
        (item: { meter_data: { rtc: string | number | Date }[] }) => {
          if (
            !item.meter_data ||
            !item.meter_data[0] ||
            !item.meter_data[0].rtc
          )
            return false;

          const itemDate = new Date(item.meter_data[0].rtc);
          const startDate = new Date(dateRange.startDate);
          const endDate = new Date(dateRange.endDate);

          return itemDate >= startDate && itemDate <= endDate;
        }
      );
      console.log(filteredData, "filteredData");
      setMeterDataHistory(filteredData);
      setTotalItems(filteredData.length);

      // Reset to first page when new data is loaded
      setCurrentPage(1);

      if (filteredData.length === 0) {
        setError("No data found for the selected criteria.");
      }
    } catch (error: any) {
      console.error("Error fetching meter data:", error);
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
      return {
        labels: [],
        consumptionData: [],
        cumulativeData: [],
        tableData: [],
        paginatedTableData: [],
        totalPages: 0,
      };
    }

    // Sort data by date
    const sortedData = [...meterDataHistory].sort((a, b) => {
      const dateA: any = new Date(a.meter_data[0].rtc);
      const dateB: any = new Date(b.meter_data[0].rtc);
      return dateA - dateB;
    });

    const labels: any[] = [];
    const dailyConsumption: any[] = [];
    const cumulativeData: any[] = [];
    const tableData: any[] = [];

    // Calculate daily consumption with improved logic
   // Replace this section in the processDataByViewType function:

sortedData.forEach((item, index) => {
  const meterReading = item.meter_data[0];
  const date = new Date(meterReading.rtc);
  const cumulativeKwh =
    parseFloat(meterReading.cumulative_energy_kwh_import) || 0;
  const cumulativeKvah =
    parseFloat(meterReading.cumulative_energy_kvah_import) || 0;
  const totalCumulative = cumulativeKwh + cumulativeKvah;

  // Direct consumption calculation - use block energy if available, otherwise use cumulative
  let dailyKwh = 0;
  let dailyKvah = 0;
  let totalDailyConsumption = 0;

  // Check if block energy data is available (this is the actual daily consumption)
  if (meterReading.block_energy_kwh_import !== undefined && meterReading.block_energy_kvah_import !== undefined) {
    dailyKwh = parseFloat(meterReading.block_energy_kwh_import) || 0;
    dailyKvah = parseFloat(meterReading.block_energy_kvah_import) || 0;
    totalDailyConsumption = dailyKwh + dailyKvah;
  } else {
    // If no block energy data, use cumulative as daily (this might be the case for your data structure)
    dailyKwh = cumulativeKwh;
    dailyKvah = cumulativeKvah;
    totalDailyConsumption = totalCumulative;
  }

  dailyConsumption.push({
    date: date,
    dateStr: date.toISOString().split("T")[0],
    consumption: totalDailyConsumption,
    kwhConsumption: dailyKwh,
    kvahConsumption: dailyKvah,
    cumulative: totalCumulative,
    cumulativeKwh: cumulativeKwh,
    cumulativeKvah: cumulativeKvah,
    originalData: item,
    isFirstDay: index === 0,
  });
});

    console.log("Processed daily consumption:", dailyConsumption);

    // Group data based on view type
    if (viewType === "daily") {
      // Show all available daily data
      dailyConsumption.forEach((item) => {
        labels.push(
          item.date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
          })
        );
        cumulativeData.push(item.consumption);

        tableData.push({
          period: item.date.toLocaleDateString("en-GB"),
          consumption: item.consumption.toLocaleString(),
          kwhConsumption: item.kwhConsumption.toFixed(2),
          kvahConsumption: item.kvahConsumption.toFixed(2),
          cumulative: item.cumulative.toLocaleString(),
          type: item.isFirstDay ? "Daily (Initial)" : "Daily",
          kvah: item.cumulativeKvah.toLocaleString(),
          kwh: item.cumulativeKwh.toLocaleString(),
          isFirstDay: item.isFirstDay,
        });
      });
    } else if (viewType === "weekly") {
      // Group by weeks
      const weeklyData = new Map();

      dailyConsumption.forEach((item) => {
        const weekStart = new Date(item.date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
        const weekKey = weekStart.toISOString().split("T")[0];

        if (!weeklyData.has(weekKey)) {
          weeklyData.set(weekKey, {
            consumption: 0,
            kwhConsumption: 0,
            kvahConsumption: 0,
            cumulative: item.cumulative,
            cumulativeKwh: item.cumulativeKwh,
            cumulativeKvah: item.cumulativeKvah,
            dates: [],
            hasFirstDay: false,
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

        labels.push(
          `${startDate.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
          })}`
        );
        cumulativeData.push(data.consumption);

        tableData.push({
          period: `Week of ${startDate.toLocaleDateString("en-GB")}`,
          consumption: data.consumption.toFixed(2),
          kwhConsumption: data.kwhConsumption.toFixed(2),
          kvahConsumption: data.kvahConsumption.toFixed(2),
          cumulative: data.cumulative.toLocaleString(),
          type: data.hasFirstDay ? "Weekly (w/ Initial)" : "Weekly",
          kvah: data.cumulativeKvah.toLocaleString(),
          kwh: data.cumulativeKwh.toLocaleString(),
        });
      });
    } else if (viewType === "monthly") {
      // Group by months
      const monthlyData = new Map();

      dailyConsumption.forEach((item) => {
        const monthKey = `${item.date.getFullYear()}-${String(
          item.date.getMonth() + 1
        ).padStart(2, "0")}`;

        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, {
            consumption: 0,
            kwhConsumption: 0,
            kvahConsumption: 0,
            cumulative: item.cumulative,
            cumulativeKwh: item.cumulativeKwh,
            cumulativeKvah: item.cumulativeKvah,
            hasFirstDay: false,
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
        const [year, month] = monthKey.split("-");
        const monthName = new Date(year, month - 1).toLocaleDateString(
          "en-GB",
          { month: "short", year: "2-digit" }
        );

        labels.push(monthName);
        cumulativeData.push(data.consumption);

        tableData.push({
          period: monthName,
          consumption: data.consumption.toFixed(2),
          kwhConsumption: data.kwhConsumption.toFixed(2),
          kvahConsumption: data.kvahConsumption.toFixed(2),
          cumulative: data.cumulative.toLocaleString(),
          type: data.hasFirstDay ? "Monthly (w/ Initial)" : "Monthly",
          kvah: data.cumulativeKvah.toLocaleString(),
          kwh: data.cumulativeKwh.toLocaleString(),
        });
      });
    }

    // Pagination for charts (limit chart data points for better readability)
    const chartItemsPerPage =
      viewType === "daily" ? 7 : viewType === "weekly" ? 8 : 6;
    const chartStartIndex = (currentPage - 1) * chartItemsPerPage;
    const chartEndIndex = chartStartIndex + chartItemsPerPage;

    const paginatedLabels = labels.slice(chartStartIndex, chartEndIndex);
    const paginatedConsumptionData = cumulativeData.slice(
      chartStartIndex,
      chartEndIndex
    );

    // Pagination for table
    const tableStartIndex = (currentPage - 1) * itemsPerPage;
    const tableEndIndex = tableStartIndex + itemsPerPage;
    const paginatedTableData = tableData.slice(tableStartIndex, tableEndIndex);

    const totalPages = Math.ceil(
      Math.max(
        labels.length / chartItemsPerPage,
        tableData.length / itemsPerPage
      )
    );

    return {
      labels: paginatedLabels,
      consumptionData: paginatedConsumptionData,
      tableData,
      paginatedTableData,
      totalPages,
      totalRecords: tableData.length,
      chartItemsPerPage,
    };
  };

  const chartData = processDataByViewType();

  // Chart configurations
  const getChartTitle = () => {
    switch (viewType) {
      case "daily":
        return "Daily Energy Consumption (kWh + kVAh)";
      case "weekly":
        return "Weekly Energy Consumption (kWh + kVAh)";
      case "monthly":
        return "Monthly Energy Consumption (kWh + kVAh)";
      default:
        return "Energy Consumption (kWh + kVAh)";
    }
  };

  const getChartColor = () => {
    switch (viewType) {
      case "daily":
        return "#3B82F6";
      case "weekly":
        return "#10B981";
      case "monthly":
        return "#F59E0B";
      default:
        return "#3B82F6";
    }
  };

 const barChartData = {
  labels: chartData.labels,
  datasets: [
    {
      label: `${
        viewType.charAt(0).toUpperCase() + viewType.slice(1)
      } Total Consumption (kWh + kVAh)`,
      data: chartData.consumptionData,
      backgroundColor: chartData.consumptionData.map((value, index) => {
        if (value === 0) {
          return "#E5E7EB"; // Gray color for zero consumption
        }
        if (viewType === "daily" && chartData.consumptionData.length > 1) {
          const nonZeroValues = chartData.consumptionData.filter(v => v > 0);
          if (nonZeroValues.length > 0) {
            const minValue = Math.min(...nonZeroValues);
            const maxValue = Math.max(...nonZeroValues);
            
            if (value === minValue || value === maxValue) {
              return "#EF4444"; // Red color for min/max (excluding zero)
            }
          }
        }
        return getChartColor(); // Default color for other bars
      }),
      borderRadius: 4,
      barThickness:
        viewType === "daily" ? 40 : viewType === "weekly" ? 50 : 60,
    },
  ],
};
  const barChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: "top" },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(
              2
            )} Total Units`;
          },
        },
      },
    },
    onClick: (event: any, elements: string | any[]) => {
      if (elements.length > 0 && viewType === "daily") {
        const dataIndex = elements[0].index;
        const clickedDateLabel = chartData.labels[dataIndex]; // This is in "DD/MM" format

        // Get the actual date from the processed data
        const actualData = processDataByViewType();
        const chartStartIndex =
          (currentPage - 1) *
          (viewType === "daily" ? 7 : viewType === "weekly" ? 8 : 6);
        const actualIndex = chartStartIndex + dataIndex;

        // Get the corresponding date from the original data
        if (actualData.tableData && actualData.tableData[actualIndex]) {
          const fullDate = actualData.tableData[actualIndex].period; // This should be the full date

          // Convert to DD/MM format for comparison
          const dateObj = new Date(fullDate.split("/").reverse().join("-")); // Convert DD/MM/YYYY to YYYY-MM-DD
          const formattedClickedDate: any = `${dateObj
            .getDate()
            .toString()
            .padStart(2, "0")}/${(dateObj.getMonth() + 1)
            .toString()
            .padStart(2, "0")}`;

          console.log("Bar clicked:", {
            clickedLabel: clickedDateLabel,
            formattedDate: formattedClickedDate,
            fullDate: fullDate,
          });

          setSelectedDate(formattedClickedDate);
          setShowHourlyView(true);
          fetchHourlyData(formattedClickedDate);
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: "#6B7280", font: { size: 12 } },
      },
      y: {
        beginAtZero: true,
        grid: { display: false },
        border: { display: false },
        ticks: {
          color: "#6B7280",
          font: { size: 12 },
          callback: function (value: any) {
            if (value >= 1000000) return (value / 1000000).toFixed(1) + "M";
            if (value >= 1000) return (value / 1000).toFixed(0) + "K";
            return value;
          },
        },
      },
    },
  };

  // Line chart for trend
  const consumptionValues = chartData.consumptionData || [];
const nonZeroValues = consumptionValues.filter((v) => v > 0);
const minValue = Math.min(...nonZeroValues);
const maxValue = Math.max(...nonZeroValues);

// Determine point colors: red for min/max, default otherwise
const pointColors = consumptionValues.map((val) => {
  if (val === minValue || val === maxValue) {
    return "#EF4444"; // Red for min or max
  }
  return getChartColor(); // Default color
});

const lineChartData: any = {
  labels: chartData.labels,
  datasets: [
    {
      label: `${
        viewType.charAt(0).toUpperCase() + viewType.slice(1)
      } Consumption Trend (kWh + kVAh)`,
      data: chartData.consumptionData,
      borderColor: getChartColor(),
      backgroundColor: "transparent",
      borderWidth: 3,
      pointRadius: 5,
      pointBackgroundColor: pointColors, // 👈 highlight min & max
      pointBorderColor: "#ffffff", // optional white border
      tension: 0.4,
    },
  ],
};


  const lineChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: "top" },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(
              2
            )} Total Units`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: "#6B7280", font: { size: 12 } },
      },
      y: {
        beginAtZero: true,
        grid: { display: false },
        border: { display: false },
        ticks: {
          color: "#6B7280",
          font: { size: 12 },
          callback: function (value: any) {
            if (value >= 1000000) return (value / 1000000).toFixed(1) + "M";
            if (value >= 1000) return (value / 1000).toFixed(0) + "K";
            return value;
          },
        },
      },
    },
  };

  const getHourlyChartData = () => {
    if (!hourlyData || hourlyData.length === 0) {
      return {
        labels: Array.from(
          { length: 24 },
          (_, i) => `${i.toString().padStart(2, "0")}:00`
        ),
        datasets: [
          {
            label: `No data available for ${selectedDate}`,
            data: Array(24).fill(0),
            backgroundColor: "#E5E7EB",
            borderRadius: 4,
            barThickness: 20,
          },
        ],
      };
    }

    // Create 24-hour structure
    const hourlyConsumption = Array(24).fill(0);
    const hourLabels = Array.from(
      { length: 24 },
      (_, i) => `${i.toString().padStart(2, "0")}:00`
    );

    // Since your API returns all 24 hours in a single object's meter_data array
    if (hourlyData.length > 0 && hourlyData[0].meter_data) {
      hourlyData[0].meter_data.forEach(
        (reading: {
          rtc: string | number | Date;
          block_energy_kwh_import: string;
          block_energy_kvah_import: string;
        }) => {
          if (reading.rtc) {
            const timestamp = new Date(reading.rtc);
            const hour = timestamp.getHours();

            // Calculate total consumption (block_energy_kwh_import + block_energy_kvah_import)
            const kwhBlock = parseFloat(reading.block_energy_kwh_import) || 0;
            const kvahBlock = parseFloat(reading.block_energy_kvah_import) || 0;
            const totalConsumption = kwhBlock + kvahBlock;

            // Assign to the corresponding hour
            if (hour >= 0 && hour < 24) {
              hourlyConsumption[hour] = totalConsumption;
            }

            console.log(`Hour ${hour}:`, {
              timestamp: timestamp.toISOString(),
              kwhBlock,
              kvahBlock,
              totalConsumption,
            });
          }
        }
      );
    }

    console.log("Processed hourly consumption:", hourlyConsumption);

    return {
      labels: hourLabels,
      datasets: [
        {
          label: `Hourly Consumption for ${selectedDate} (kWh + kVAh)`,
          data: hourlyConsumption,
          backgroundColor: "#8B5CF6",
          borderRadius: 4,
          barThickness: 20,
        },
      ],
    };
  };

  const hourlyChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: "top" },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(
              2
            )} Units`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: "#6B7280", font: { size: 10 } },
      },
      y: {
        beginAtZero: true,
        grid: { display: false },
        border: { display: false },
        ticks: { color: "#6B7280", font: { size: 12 } },
      },
    },
  };

  const fetchHourlyData = async (selectedDateStr: any) => {
    setLoading(true);
    setError(null);

    try {
      // Parse the selected date string (format: "DD/MM")
      const [day, month] = selectedDateStr.split("/");
      const year = new Date().getFullYear(); // Assuming current year
      const formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(
        2,
        "0"
      )}`;

      console.log("Fetching hourly data for date:", formattedDate);
      console.log("Selected date string:", selectedDateStr);

      // Build query parameters for hourly data
      const params = new URLSearchParams();
      if (meterId) params.append("device_id", meterId);
      params.append("date", formattedDate);

      const response = await fetch(`${API_BASE_URL}/meters/meterhourslogs`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Hourly API Response:", data);

      // Process the hourly data
      let processedHourlyData = [];
      if (Array.isArray(data)) {
        processedHourlyData = data;
      } else if (data.data && Array.isArray(data.data)) {
        processedHourlyData = data.data;
      } else if (data.results && Array.isArray(data.results)) {
        processedHourlyData = data.results;
      }

      // Filter data for the selected date and same device
      const filteredHourlyData = processedHourlyData.filter(
        (item: { timestamp: string | number | Date; device_id: string }) => {
          if (!item.timestamp || !item.device_id) return false;

          const itemDate = new Date(item.timestamp);
          const targetDate = new Date(formattedDate);

          console.log("Comparing dates:", {
            itemDate: itemDate.toDateString(),
            targetDate: targetDate.toDateString(),
            deviceMatch: item.device_id === meterId,
          });

          // Check if same date and same device
          return (
            itemDate.toDateString() === targetDate.toDateString() &&
            item.device_id === meterId
          );
        }
      );

      console.log("Filtered hourly data:", filteredHourlyData);
      setHourlyData(filteredHourlyData);

      if (filteredHourlyData.length === 0) {
        setError(`No hourly data found for ${selectedDateStr}`);
      }
    } catch (error: any) {
      console.error("Error fetching hourly data:", error);
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
    setMeterId("CDA00001008");
    setSelectedRegion("");
    setViewType("daily");
    setDateRange({
      startDate: "2025-06-01",
      endDate: "2025-06-07",
    });
    setCurrentPage(1);
  };

  // Pagination handlers
  const handlePageChange = (page: any) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: any) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  // Pagination component
  const PaginationComponent = ({
    totalPages,
    currentPage,
    onPageChange,
    totalRecords,
    itemsPerPage,
    onItemsPerPageChange,
  }: any) => {
    const getPageNumbers = () => {
      const pages = [];
      const maxPagesToShow = 5;

      if (totalPages <= maxPagesToShow) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        if (currentPage <= 3) {
          pages.push(1, 2, 3, 4, "...", totalPages);
        } else if (currentPage >= totalPages - 2) {
          pages.push(
            1,
            "...",
            totalPages - 3,
            totalPages - 2,
            totalPages - 1,
            totalPages
          );
        } else {
          pages.push(
            1,
            "...",
            currentPage - 1,
            currentPage,
            currentPage + 1,
            "...",
            totalPages
          );
        }
      }

      return pages;
    };

    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, totalRecords)} of{" "}
            {totalRecords} results
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
              onClick={() => typeof page === "number" && onPageChange(page)}
              disabled={page === "..."}
              className={`px-3 py-1 text-sm border rounded-md ${
                page === currentPage
                  ? "bg-blue-600 text-white border-blue-600"
                  : page === "..."
                  ? "text-gray-400 border-gray-300 cursor-not-allowed"
                  : "text-gray-700 border-gray-300 hover:bg-gray-50"
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
  const latestData: any =
    meterDataHistory.length > 0
      ? meterDataHistory[meterDataHistory.length - 1]
      : null;

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
                      onChange={(e) =>
                        setDateRange((prev) => ({
                          ...prev,
                          startDate: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) =>
                        setDateRange((prev) => ({
                          ...prev,
                          endDate: e.target.value,
                        }))
                      }
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
                    {loading ? "LOADING..." : "SUBMIT"}
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
                    <span className="font-medium">Meter ID:</span>{" "}
                    {latestData?.device_id || meterId}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Region:</span>{" "}
                    {selectedRegion || "North Zone"}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">View:</span>{" "}
                    {viewType.charAt(0).toUpperCase() + viewType.slice(1)}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Records:</span>{" "}
                    {meterDataHistory.length}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-green-600">
                      Combined kWh + kVAh Data (Improved Calculation)
                    </span>
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
                      {showHourlyView && (
                        <div
                          onClick={() => setShowHourlyView(false)}
                          className="display-flex gap-2 cursor-pointer"
                        >
                          <svg
                            className="w-6 h-6 text-gray-800 dark:text-white"
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 14 10"
                          >
                            <path
                              stroke="currentColor"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M13 5H1m0 0 4 4M1 5l4-4"
                            />
                          </svg>
                        </div>
                      )}
                      <br />
                      <div className="flex justify-between items-center mb-4">
                        <h1 className="text-lg font-medium">
                          {showHourlyView
                            ? `Hourly Data for ${selectedDate}`
                            : getChartTitle()}
                        </h1>

                        <div className="text-sm text-gray-500">
                          Page {currentPage} of {chartData.totalPages}
                          {chartData.totalPages > 1 && (
                            <span className="ml-2">
                              ({chartData.chartItemsPerPage} items per chart)
                            </span>
                          )}
                        </div>
                      </div>

                      {showHourlyView ? (
                        // Hourly view - single bar chart
                        <div className="flex justify-center">
                          <div className="w-full max-w-4xl">
                            <div className="h-64">
                              <Bar
                                data={getHourlyChartData()}
                                options={hourlyChartOptions}
                              />
                            </div>
                            <div className="text-center text-xs text-gray-500 mt-2">
                              Hourly Consumption (Combined kWh + kVAh)
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-6">
                          {/* Bar Chart */}
                          <div className="relative">
                            <div className="h-64">
                              <Bar
                                data={barChartData}
                                options={barChartOptions}
                              />
                            </div>
                            <div className="text-center text-xs text-gray-500 mt-2">
                              {viewType === "daily"
                                ? "Date"
                                : viewType === "weekly"
                                ? "Week"
                                : "Month"}{" "}
                              (Combined kWh + kVAh)
                            </div>
                          </div>

                          {/* Line Chart */}
                          <div className="relative">
                            <div className="h-64">
                              <Line
                                data={lineChartData}
                                options={lineChartOptions}
                              />
                            </div>
                            <div className="text-center text-xs text-gray-500 mt-2">
                              Consumption Trend (Combined kWh + kVAh)
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Chart Pagination */}
                      {!showHourlyView && chartData.totalPages > 1 && (
                        <div className="mt-4 flex justify-center">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handlePageChange(currentPage - 1)}
                              disabled={currentPage === 1}
                              className="px-3 py-1 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Previous
                            </button>
                            <span className="px-3 py-1 text-sm text-gray-700">
                              {currentPage} / {chartData.totalPages}
                            </span>
                            <button
                              onClick={() => handlePageChange(currentPage + 1)}
                              disabled={currentPage === chartData.totalPages}
                              className="px-3 py-1 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Next
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
                        {chartData.paginatedTableData.length > 0 ? (
                          chartData.paginatedTableData.map((row, index) => (
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
                                {row.kvah || "N/A"}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                <span
                                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    row.type === "Daily"
                                      ? "bg-blue-100 text-blue-800"
                                      : row.type === "Weekly"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-yellow-100 text-yellow-800"
                                  }`}
                                >
                                  {row.type}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan="5"
                              className="px-4 py-8 text-center text-sm text-gray-500"
                            >
                              No data available for selected criteria
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Table Pagination */}
                  {chartData?.totalRecords > itemsPerPage && (
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
                        <h4 className="text-sm font-medium text-gray-900 mb-2">
                          Device Info
                        </h4>
                        <div className="text-xs text-gray-600 space-y-1">
                          <div>
                            <strong>Device ID:</strong> {latestData?.device_id}
                          </div>
                          <div>
                            <strong>User ID:</strong> {latestData?.user_id}
                          </div>
                          <div>
                            <strong>Records:</strong> {meterDataHistory.length}
                          </div>
                          <div>
                            <strong>View Type:</strong>{" "}
                            {viewType.charAt(0).toUpperCase() +
                              viewType.slice(1)}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-green-50 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">
                          Latest Reading
                        </h4>
                        <div className="text-xs text-gray-600 space-y-1">
                          <div>
                            <strong>kWh Import:</strong>{" "}
                            {latestData
                              ? parseFloat(
                                  latestData.meter_data[0]
                                    .cumulative_energy_kwh_import
                                ).toLocaleString()
                              : "N/A"}
                          </div>
                          <div>
                            <strong>kVAh Import:</strong>{" "}
                            {latestData
                              ? parseFloat(
                                  latestData.meter_data[0]
                                    .cumulative_energy_kvah_import
                                ).toLocaleString()
                              : "N/A"}
                          </div>
                          <div>
                            <strong>Last Update:</strong>{" "}
                            {latestData
                              ? new Date(
                                  latestData.timestamp
                                ).toLocaleDateString("en-GB")
                              : "N/A"}
                          </div>
                          <div>
                            <strong>RTC:</strong>{" "}
                            {latestData
                              ? new Date(
                                  latestData.meter_data[0].rtc
                                ).toLocaleDateString("en-GB")
                              : "N/A"}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-amber-50 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">
                          Consumption Stats
                        </h4>
                        <div className="text-xs text-gray-600 space-y-1">
                          <div>
                            <strong>Total Consumption:</strong>{" "}
                            {chartData.tableData
                              .reduce(
                                (sum, item) =>
                                  sum + parseFloat(item.consumption),
                                0
                              )
                              .toFixed(2)}{" "}
                            kWh
                          </div>
                          <div>
                            <strong>Average:</strong>{" "}
                            {chartData.tableData.length > 0
                              ? (
                                  chartData.tableData.reduce(
                                    (sum, item) =>
                                      sum + parseFloat(item.consumption),
                                    0
                                  ) / chartData.tableData.length
                                ).toFixed(2)
                              : "N/A"}{" "}
                            kWh
                          </div>
                          <div>
                            <strong>Peak:</strong>{" "}
                            {chartData.tableData.length > 0
                              ? Math.max(
                                  ...chartData.tableData.map((item) =>
                                    parseFloat(item.consumption)
                                  )
                                ).toFixed(2)
                              : "N/A"}{" "}
                            kWh
                          </div>
                          <div>
                            <strong>IP Address:</strong>{" "}
                            {latestData?.ip_address || "N/A"}
                          </div>
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
