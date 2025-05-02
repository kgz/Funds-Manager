import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	Legend,
	ReferenceLine,
	Brush,
} from "recharts";
import { useEffect, useMemo, useState } from "react";
import { MonthlyBarGraph } from "@/graphs/bar";

type Transaction = {
	id: number;
	statement_id: number;
	description: string;
	amount: number;
	transaction_date: string;
	last_updated: string | null | undefined;
	deleted_at: string | null | undefined;
	created_at: string | null | undefined;
	status: "";
};

export const Main = () => {
	const [data, setData] = useState<Transaction[]>([]);
	const [file, setFile] = useState<File | null>(null);
	const [selectedRange, setSelectedRange] = useState<[number, number]>([0, 0]);
	const [frequency, setFrequency] = useState<"week" | "month" | "year">("month");

	useEffect(() => {
		const fetchData = async () => {
			try {
				const response = await fetch("/api/transactions");
				if (!response.ok) throw new Error("Network error");
				const jsonData = await response.json();
				setData(jsonData);
			} catch (error) {
				console.error("Error fetching data:", error);
			}
		};
		fetchData();
	}, []);

	const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = event.target.files?.[0];
		if (selectedFile?.type === "application/pdf") {
			setFile(selectedFile);
		} else {
			alert("Please upload a valid PDF.");
		}
	};

	const handleSubmitFile = async () => {
		if (!file) return alert("No file selected");

		const formData = new FormData();
		formData.append("file", file);

		try {
			const response = await fetch("/api/statement", {
				method: "POST",
				body: formData,
			});

			if (!response.ok) throw new Error("Upload failed");
			const result = await response.json();
			console.log("Upload result:", result);
		} catch (error) {
			console.error("Upload error:", error);
		}
	};

	const { spendingData, runningTotalData } = useMemo(() => {
		const grouped: { [date: string]: number } = {};
		let runningTotal = 0;
		const sorted = [...data].sort(
			(a, b) =>
				new Date(a.transaction_date).getTime() -
				new Date(b.transaction_date).getTime()
		);

		const daily: { date: string; amount: number }[] = [];
		const cumulative: { date: string; total: number }[] = [];

		sorted.forEach((tx) => {
			const date = new Date(tx.transaction_date).toLocaleDateString("en-US");
			const amount = tx.amount / 100;
			grouped[date] = (grouped[date] || 0) + amount;
		});

		Object.entries(grouped).forEach(([date, amount]) => {
			runningTotal += amount;
			daily.push({ date, amount: parseFloat(amount.toFixed(2)) });
			cumulative.push({ date, total: parseFloat(runningTotal.toFixed(2)) });
		});

		return { spendingData: daily, runningTotalData: cumulative };
	}, [data]);

	const formatDateByFrequency = (date: string) => {
		const d = new Date(date);
		switch (frequency) {
			case "week":
				const startOfWeek = new Date(d.setDate(d.getDate() - d.getDay()));
				return startOfWeek.toLocaleDateString("en-AU", {
					year: "numeric",
					month: "2-digit",
					day: "2-digit",
				});
			case "month":
				return d.toLocaleDateString("en-AU", {
					year: "numeric",
					month: "2-digit",
				});
			case "year":
				return d.toLocaleDateString("en-AU", {
					year: "numeric",
				});
			default:
				return date;
		}
	};

	// Group data by frequency (week/month/year)
	const groupedData = useMemo(() => {
		const grouped: { [key: string]: number } = {};
		const sorted = [...data].sort(
			(a, b) =>
				new Date(a.transaction_date).getTime() -
				new Date(b.transaction_date).getTime()
		);

		sorted.forEach((tx) => {
			const formattedDate = formatDateByFrequency(tx.transaction_date);
			const amount = tx.amount / 100;
			grouped[formattedDate] = (grouped[formattedDate] || 0) + amount;
		});

		const result = Object.entries(grouped).map(([date, amount]) => ({
			date,
			amount: parseFloat(amount.toFixed(2)),
			status: amount >= 0 ? "Positive" : "Negative",
		}));

		return result;
	}, [data, frequency]);

	const monthlySummary = useMemo(() => {
		const summary: { [month: string]: { spending: number; receiving: number } } = {};

		data.forEach(tx => {
			const date = new Date(tx.transaction_date);
			const month = date.toLocaleString("en-US", { year: "numeric", month: "short" });
			const amount = tx.amount / 100;

			if (!summary[month]) {
				summary[month] = { spending: 0, receiving: 0 };
			}

			if (amount < 0) {
				summary[month].spending += Math.abs(amount);
			} else {
				summary[month].receiving += amount;
			}
		});

		return Object.entries(summary).map(([month, values]) => ({
			month,
			...values,
		}));
	}, [data]);

	return (
		<div className="p-4 space-y-10">
			<h1 className="text-2xl font-bold">Spending Analysis</h1>

			{/* File Upload */}
			<div>
				<input
					type="file"
					accept=".pdf"
					onChange={handleFileUpload}
					className="border p-2 mr-2"
				/>
				<button
					onClick={handleSubmitFile}
					className="bg-blue-500 text-white px-4 py-2 rounded"
				>
					Upload PDF
				</button>
			</div>

			{/* Frequency Selector */}
			<div>
				<select
					value={frequency}
					onChange={(e) => setFrequency(e.target.value as "week" | "month" | "year")}
					className="border p-2 mr-2"
				>
					<option value="week">Week</option>
					<option value="month">Month</option>
					<option value="year">Year</option>
				</select>
			</div>

			{/* Data Table */}
			<div className="space-y-4">
				<h2 className="text-lg font-semibold mb-2">Grouped by {frequency}</h2>
				<table className="w-full table-auto border">
					<thead>
						<tr>
							<th className="border px-4 py-2">Date</th>
							<th className="border px-4 py-2">Amount</th>
							<th className="border px-4 py-2">Status</th>
						</tr>
					</thead>
					<tbody>
						{groupedData.map((item, index) => (
							<tr key={index}>
								<td className="border px-4 py-2">{item.date}</td>
								<td className="border px-4 py-2">{item.amount.toFixed(2)}</td>
								<td className="border px-4 py-2">{item.status}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* Daily Spending Chart */}
			<div>
				<h2 className="text-lg font-semibold mb-2">Daily Spending</h2>
				<ResponsiveContainer width="100%" height={300}>
					<LineChart data={spendingData}>
						<CartesianGrid strokeDasharray="3 3" />
						<XAxis dataKey="date" />
						<YAxis tickFormatter={(val) => val.toFixed(2)} />
						<Tooltip formatter={(value: any) => value.toFixed(2)} />
						<Legend />
						<Line type="linear" dataKey="amount" stroke="#8884d8" />
						<ReferenceLine
							y={
								spendingData.reduce((sum, d) => sum + d.amount, 0) /
								spendingData.length
							}
							stroke="red"
							strokeDasharray="3 3"
							label={{ value: "Avg", position: "right", fill: "red" }}
						/>
						<Brush
							dataKey="date"
							height={30}
							stroke="#8884d8"
							onChange={(newRange) => {
								if (newRange && newRange.hasOwnProperty("startIndex") && newRange.hasOwnProperty("endIndex")) {
									setSelectedRange([newRange.startIndex ?? 0, newRange.endIndex ?? 0]);
								}
							}}
						/>
					</LineChart>
				</ResponsiveContainer>
			</div>

			{/* Running Total Chart */}
			<div>
				<h2 className="text-lg font-semibold mb-2">Running Total</h2>
				<ResponsiveContainer width="100%" height={300}>
					<LineChart data={runningTotalData}>
						<CartesianGrid strokeDasharray="3 3" />
						<XAxis dataKey="date" />
						<YAxis tickFormatter={(val) => val.toFixed(2)} />
						<Tooltip formatter={(value: any) => value.toFixed(2)} />
						<Legend />
						<Line type="monotone" dataKey="total" stroke="#82ca9d" />
						<ReferenceLine
							y={
								runningTotalData.reduce((sum, d) => sum + d.total, 0) /
								runningTotalData.length
							}
							stroke="red"
							strokeDasharray="3 3"
							label={{ value: "Avg", position: "right", fill: "red" }}
						/>
						<Brush
							dataKey="date"
							height={30}
							stroke="#82ca9d"
							onChange={(newRange) => {
								if (newRange && newRange.hasOwnProperty("startIndex") && newRange.hasOwnProperty("endIndex")) {
									setSelectedRange([newRange.startIndex ?? 0, newRange.endIndex ?? 0]);
								}
							}}
						/>
					</LineChart>
				</ResponsiveContainer>
			</div>
			<div className="">
				<MonthlyBarGraph data={monthlySummary} />
			</div>
		</div>

	);
};
