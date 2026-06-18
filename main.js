(function () {
	'use strict';

	let chartInstance = null;
	let currentData = null;

	// --- Utilities ---

	function roundTo(number, precision) {
		const factor = 10 ** precision;
		return Math.round(number * factor) / factor;
	}

	function formatBytes(bytes) {
		if (bytes === 0) return '0 B';
		const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
		const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
		const value = bytes / (1024 ** i);
		return roundTo(value, i < 2 ? 0 : 2) + ' ' + units[i];
	}

	function formatBytesGiB(bytes) {
		return roundTo(bytes / (1024 ** 3), 3);
	}

	const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	function formatDate(timestamp, timeScale) {
		const d = new Date(timestamp * 1000);
		const pad = (n) => n.toString().padStart(2, '0');
		switch (timeScale) {
			case 'hour':
				return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:00`;
			case 'day':
			case 'top':
				return `${DAY_NAMES[d.getDay()]}, ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
			case 'month':
				return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
			case 'year':
				return `${d.getFullYear()}`;
			default:
				return d.toLocaleDateString();
		}
	}

	// --- Theme Management ---

	function getEffectiveTheme() {
		const stored = localStorage.getItem('theme');
		if (stored) return stored;
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}

	function applyTheme(theme) {
		document.documentElement.setAttribute('data-theme', theme);
		const icon = document.getElementById('theme-icon');
		if (icon) icon.textContent = theme === 'dark' ? '☀' : '☾';
		updateChartColors();
	}

	function toggleTheme() {
		const current = getEffectiveTheme();
		const next = current === 'dark' ? 'light' : 'dark';
		localStorage.setItem('theme', next);
		applyTheme(next);
	}

	function getThemeColors() {
		const style = getComputedStyle(document.documentElement);
		return {
			fg: style.getPropertyValue('--fg-primary').trim(),
			secondary: style.getPropertyValue('--fg-secondary').trim(),
			border: style.getPropertyValue('--border-color').trim(),
		};
	}

	function updateChartColors() {
		if (!chartInstance) return;
		const colors = getThemeColors();
		Chart.defaults.color = colors.fg;
		chartInstance.options.scales.x.grid.color = colors.border;
		chartInstance.options.scales.y.grid.color = colors.border;
		chartInstance.options.scales.x.ticks.color = colors.fg;
		chartInstance.options.scales.y.ticks.color = colors.fg;
		if (chartInstance.options.plugins.title) {
			chartInstance.options.plugins.title.color = colors.fg;
		}
		chartInstance.update();
	}

	// --- Stats ---

	function computeStats(data) {
		const totalRx = data.reduce((sum, e) => sum + e.rx, 0);
		const totalTx = data.reduce((sum, e) => sum + e.tx, 0);
		const peak = data.length > 0 ? Math.max(...data.map(e => e.rx + e.tx)) : 0;
		return { totalRx, totalTx, peak, total: totalRx + totalTx };
	}

	function renderStats(stats) {
		document.getElementById('stat-rx').textContent = formatBytes(stats.totalRx);
		document.getElementById('stat-tx').textContent = formatBytes(stats.totalTx);
		document.getElementById('stat-peak').textContent = formatBytes(stats.peak);
		document.getElementById('stat-total').textContent = formatBytes(stats.total);
	}

	function resetStats() {
		['stat-rx', 'stat-tx', 'stat-peak', 'stat-total'].forEach(id => {
			document.getElementById(id).textContent = '—';
		});
	}

	// --- Loading ---

	function showLoading() {
		document.getElementById('loading-overlay').classList.add('active');
	}

	function hideLoading() {
		document.getElementById('loading-overlay').classList.remove('active');
	}

	// --- Chart ---

	function createChart(ifdata, ifname, timeScale, stackGraphs) {
		const canvas = document.getElementById('graph-canvas');
		if (chartInstance) {
			chartInstance.destroy();
			chartInstance = null;
		}

		const colors = getThemeColors();
		const labels = ifdata.map(e => formatDate(e.time, timeScale));
		const datasets = [
			{
				label: 'Rx',
				data: ifdata.map(e => formatBytesGiB(e.rx)),
				backgroundColor: 'rgba(59, 130, 246, 0.7)',
				borderColor: '#3b82f6',
				borderWidth: 2,
				borderRadius: 4,
			},
			{
				label: 'Tx',
				data: ifdata.map(e => formatBytesGiB(e.tx)),
				backgroundColor: 'rgba(245, 158, 11, 0.7)',
				borderColor: '#f59e0b',
				borderWidth: 2,
				borderRadius: 4,
			},
		];

		if (!stackGraphs) {
			datasets.push({
				label: 'Total',
				data: ifdata.map(e => formatBytesGiB(e.rx + e.tx)),
				backgroundColor: 'rgba(16, 185, 129, 0.7)',
				borderColor: '#10b981',
				borderWidth: 2,
				borderRadius: 4,
			});
		}

		chartInstance = new Chart(canvas, {
			type: 'bar',
			data: { labels, datasets },
			options: {
				responsive: true,
				maintainAspectRatio: true,
				interaction: {
					intersect: false,
					mode: 'index',
				},
				plugins: {
					title: {
						display: true,
						text: ifname,
						color: colors.fg,
						font: { size: 16, weight: '600', family: "'Inter', sans-serif" },
						padding: { bottom: 16 },
					},
					tooltip: {
						backgroundColor: 'rgba(15, 23, 42, 0.9)',
						titleFont: { family: "'Inter', sans-serif" },
						bodyFont: { family: "'Inter', sans-serif" },
						padding: 12,
						cornerRadius: 8,
						callbacks: {
							label: function (context) {
								return context.dataset.label + ': ' + context.parsed.y + ' GiB';
							},
						},
					},
					legend: {
						labels: {
							color: colors.fg,
							font: { family: "'Inter', sans-serif", weight: '500' },
							usePointStyle: true,
							pointStyle: 'rectRounded',
							padding: 16,
						},
					},
				},
				scales: {
					x: {
						stacked: stackGraphs,
						grid: { color: colors.border, drawBorder: false },
						ticks: {
							color: colors.fg,
							font: { family: "'Inter', sans-serif", size: 11 },
							maxRotation: 45,
						},
					},
					y: {
						stacked: stackGraphs,
						beginAtZero: true,
						grid: { color: colors.border, drawBorder: false },
						ticks: {
							color: colors.fg,
							font: { family: "'Inter', sans-serif", size: 11 },
							callback: function (value) {
								return value + ' GiB';
							},
						},
					},
				},
			},
		});
	}

	// --- Error Display ---

	function showError(message) {
		const chartCard = document.getElementById('chart-card');
		const canvas = document.getElementById('graph-canvas');
		canvas.style.display = 'none';

		let errorEl = chartCard.querySelector('.error-msg');
		if (!errorEl) {
			errorEl = document.createElement('p');
			errorEl.className = 'error-msg';
			chartCard.appendChild(errorEl);
		}
		errorEl.textContent = message;
	}

	function clearError() {
		const chartCard = document.getElementById('chart-card');
		const canvas = document.getElementById('graph-canvas');
		canvas.style.display = '';

		const errorEl = chartCard.querySelector('.error-msg');
		if (errorEl) errorEl.remove();
	}

	// --- URL Params ---

	function readParams() {
		const usp = new URLSearchParams(window.location.search);
		return {
			ifname: usp.get('ifname') || null,
			timeScale: usp.get('ts') || 'day',
			timeSlots: parseInt(usp.get('nr'), 10) || 8,
			stack: usp.has('stack'),
		};
	}

	function getControlValues() {
		return {
			ifname: document.getElementById('ifname-select').value,
			timeScale: document.getElementById('ts-select').value,
			timeSlots: parseInt(document.getElementById('nr-box').value, 10) || 8,
			stack: document.getElementById('stack-checkbox').checked,
		};
	}

	function syncURL(params) {
		const url = new URL(window.location);
		url.searchParams.set('ifname', params.ifname);
		url.searchParams.set('ts', params.timeScale);
		url.searchParams.set('nr', params.timeSlots);
		if (params.stack) {
			url.searchParams.set('stack', '');
		} else {
			url.searchParams.delete('stack');
		}
		history.replaceState(null, '', url);
	}

	function applyParamsToControls(params) {
		document.getElementById('ts-select').value = params.timeScale;
		document.getElementById('nr-box').value = params.timeSlots;
		document.getElementById('stack-checkbox').checked = params.stack;
	}

	// --- Data Fetching ---

	function fetchAndRender() {
		const params = getControlValues();
		syncURL(params);
		showLoading();
		clearError();

		fetch(`data.php?requesttype=data&ifname=${encodeURIComponent(params.ifname)}&timescale=${encodeURIComponent(params.timeScale)}&period=${params.timeSlots}`, {
			credentials: 'same-origin',
		})
			.then(response => {
				if (!response.ok) throw new Error('Failed to fetch data');
				return response.json();
			})
			.then(data => {
				currentData = data;
				renderStats(computeStats(data));
				createChart(data, params.ifname, params.timeScale, params.stack);
			})
			.catch(() => {
				resetStats();
				showError('Failed to load bandwidth data.');
			})
			.finally(() => {
				hideLoading();
			});
	}

	function fetchInterfaces() {
		showLoading();

		fetch('data.php?requesttype=iflist', { credentials: 'same-origin' })
			.then(response => {
				if (!response.ok) throw new Error('Failed to fetch interfaces');
				return response.json();
			})
			.then(data => {
				if (!data || data.length === 0) {
					hideLoading();
					showError('No interfaces available.');
					document.getElementById('stats-cards').style.display = 'none';
					return;
				}

				const select = document.getElementById('ifname-select');
				data.forEach(name => {
					const option = document.createElement('option');
					option.value = name;
					option.textContent = name;
					select.appendChild(option);
				});

				const params = readParams();
				if (params.ifname && data.includes(params.ifname)) {
					select.value = params.ifname;
				} else {
					select.value = data[0];
				}

				applyParamsToControls(params);
				fetchAndRender();
			})
			.catch(() => {
				hideLoading();
				showError('Failed to connect to vnstat backend.');
			});
	}

	// --- Controls ---

	function initControls() {
		const controls = ['ifname-select', 'ts-select', 'nr-box', 'stack-checkbox'];
		controls.forEach(id => {
			document.getElementById(id).addEventListener('change', fetchAndRender);
		});
	}

	// --- Init ---

	function init() {
		applyTheme(getEffectiveTheme());

		document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

		window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
			if (!localStorage.getItem('theme')) {
				applyTheme(getEffectiveTheme());
			}
		});

		Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

		initControls();
		fetchInterfaces();

		window.addEventListener('beforeprint', () => {
			if (!chartInstance) return;
			chartInstance.options.scales.x.grid.color = '#ccc';
			chartInstance.options.scales.y.grid.color = '#ccc';
			chartInstance.options.scales.x.ticks.color = 'black';
			chartInstance.options.scales.y.ticks.color = 'black';
			Chart.defaults.color = 'black';
			chartInstance.update();
			chartInstance.resize();
		});

		window.addEventListener('afterprint', updateChartColors);
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
