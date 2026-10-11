# NetSim: Interactive Network Congestion Simulator

A browser-based simulation of one router with a finite FIFO queue. It simulates traffic only; it never reads or changes your real network.

## Run (Windows, no installation)
1. Extract `netsim.zip` (right-click > Extract All). Keep all 5 files in one folder.
2. Double-click `index.html` (opens in Chrome or Edge). No Live Server or terminal is needed.
   Optional: in VS Code use File > Open Folder > `netsim`, then right-click `index.html` > Open with Live Server (if installed).
3. Internet is needed once per page load because Chart.js is loaded from a CDN (`cdn.jsdelivr.net`).

## What you should see
Controls on the left, a topology diagram (Source > Queue > Router > Link > Destination), 8 metric cards, a status badge, 4 empty charts, a comparison section and an explanation section.

## Using it
- **Low / Medium / High**: set the arrival rate to 20 / 45 / 90 pkt/s. Sliders change arrival rate, router rate and queue capacity (also while running).
- **Start** begins, **Pause** freezes, **Resume** continues, **Reset** clears counters, queue and charts.
- **Run comparison** simulates the three presets for 60 simulated seconds each with your router rate and queue size.

## Troubleshooting
- Charts empty or an alert about Chart.js: no internet or the CDN is blocked. Reconnect and press F5.
- Buttons do nothing: press F12 > Console and read the red error. Check that `script.js` is in the same folder and not renamed (e.g. `script.js.txt`; enable File name extensions in Explorer).
- Page has no styling: `style.css` is missing or renamed.

## Simulation model (assumptions)
One step = 0.1 s. Each step: (1) packets arrive (Poisson random count, mean = rate x 0.1); (2) each is admitted if queue length < capacity, otherwise dropped (tail drop); (3) the router sends floor(accumulated rate x time) packets from the queue front (FIFO); (4) metrics update. All packets are equal size; delay is measured to 0.1 s resolution. It is not TCP and has no retransmission or congestion window.

## Formulas
Loss % = dropped / generated x 100. Throughput = delivered / elapsed seconds. Utilization % = queue length / capacity x 100. Avg queueing delay = sum of (departure time - arrival time) / delivered. Division by zero returns 0.
Invariant displayed in the app: generated = delivered + dropped + in queue.

## Testing status
The simulation core was run in Node.js with seeded runs; packet conservation held and queue length never exceeded capacity. The browser interface (buttons, canvas, charts) was not run in a real browser by the author of this file, so follow `project-report.md` section 16 on your laptop.
