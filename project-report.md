# Project Report: NetSim, Interactive Network Congestion Simulator

## 1. Title
NetSim: Interactive Network Congestion Simulator

## 2. Abstract
NetSim is a web application that simulates a router with a finite FIFO queue to show how congestion arises when arrival rate exceeds transmission rate. It reports packet loss, queueing delay, throughput and queue utilization live, plots them, and compares low, medium and high traffic.

## 3. Introduction
Packet-switched networks share links among many flows. When packets arrive faster than they can be sent, they wait in router buffers; when buffers fill, packets are dropped.

## 4. Problem Statement
Congestion is hard to observe in real networks and difficult to explain with static diagrams. A safe, interactive simulation is needed.

## 5. Objectives
Model a finite FIFO queue; generate adjustable traffic; compute loss, delay, throughput and utilization; classify congestion; compare scenarios; give rule-based advice.

## 6. Existing System
Tools such as ns-3, Cisco Packet Tracer and Wireshark are powerful but need installation and learning time, and Wireshark observes real traffic rather than teaching the queue model.

## 7. Proposed System
A zero-install, single-page simulator that runs in any browser and exposes the parameters that cause congestion.

## 8. Scope
A single bottleneck router, one queue, equal-size packets. Out of scope: TCP, routing, multiple hops, real traffic.

## 9. Technologies and Requirements
HTML5 (structure), CSS3 (layout), JavaScript (logic), Chart.js 4.4.1 (charts, via CDN). Windows laptop, Chrome or Edge, VS Code (optional), internet for the CDN.

## 10. System Architecture
User controls (index.html) -> script.js UI layer -> Sim class (core) -> metrics -> canvas, metric cards, Chart.js charts. No backend or database.

## 11. Modules
Traffic generator; FIFO queue; transmitter; metrics calculator; congestion classifier; topology renderer; charts; scenario comparer; analysis engine.

## 12. Algorithm (per 0.1 s step)
1. If queue > capacity, drop excess from the tail. 2. n = Poisson(arrival rate x 0.1); generated += n. 3. For each packet: if queue < capacity, enqueue with timestamp, else dropped++. 4. credit += router rate x 0.1. 5. While credit >= 1 and queue not empty: dequeue front, delay += now - arrival, delivered++, credit--. 6. Update metrics, charts and display.

## 13. Flowchart
```
Start step -> Generate arrivals -> Queue full? --yes--> Drop packet
                                        |no
                                   Enqueue (timestamp)
                                        v
              Add transmit credit -> Send from front while credit>=1 and queue not empty
                                        v
                              Update metrics -> Update charts/UI -> Next step
```

## 14. Mathematical Formulas
Loss % = dropped / generated x 100. Throughput = delivered / elapsed time. Utilization % = queue length / capacity x 100. Average delay = sum of waiting times / delivered. Load = arrival rate / transmission rate. Status: High if utilization >= 80% or loss >= 5%; Moderate if utilization >= 40% or any drop; else Normal.

## 15. Implementation Details
`Sim` (no DOM) holds the state and `step()`; the UI code reads sliders each step, so changes apply immediately. A seeded generator makes comparison runs repeatable. The canvas redraws every animation frame. Elements are linked by id (e.g. `btnStart`, `mLoss`, `cQueue`).

## 16. Test Cases
| # | Test | Expected |
|---|------|----------|
| 1 | Start with defaults | Counters increase, charts grow |
| 2 | Pause then Resume | Counters freeze, then continue |
| 3 | Reset | All metrics 0, charts empty, queue empty |
| 4 | High preset, router 50, queue 30 | Drops appear, loss rises, status High |
| 5 | Low preset | No drops, low delay, status Normal |
| 6 | Queue capacity set to 5 | Queue length never exceeds 5 |
| 7 | Raise router rate above arrival rate | Queue drains, loss stops growing |
| 8 | Check line under cards | Says OK (generated = delivered + dropped + queue) |
| 9 | Run comparison | Table and bar chart fill; high has most loss and delay |

## 17. Results and Observations
Do not copy numbers from anywhere. Run each scenario for 60 s (use the comparison button or run live) and record:

| Scenario | Arrival | Router rate | Queue cap | Loss % | Avg delay (ms) | Throughput | Final status |
|---|---|---|---|---|---|---|---|
| Low | 20 | 50 | 30 | (fill) | (fill) | (fill) | (fill) |
| Medium | 45 | 50 | 30 | (fill) | (fill) | (fill) | (fill) |
| High | 90 | 50 | 30 | (fill) | (fill) | (fill) | (fill) |

Observe: throughput cannot exceed the router rate; delay and loss rise sharply as load approaches and passes 100%.

## 18. Advantages
No installation, safe, visual, adjustable, repeatable comparisons.

## 19. Limitations
Single queue and hop; equal packet sizes; random arrivals not real traces; no TCP, retransmission, or RED/AQM; 0.1 s time resolution.

## 20. Future Enhancements
Packet-size variation, multiple routers, TCP Reno window simulation, RED queues, CSV export.

## 21. Conclusion
The project shows that congestion appears when load approaches capacity, that finite buffers convert overload into loss, and that bigger buffers trade loss for delay.

## 22. References
MDN Web Docs (HTML, CSS, Canvas, JavaScript); Chart.js documentation (chartjs.org); Kurose and Ross, Computer Networking: A Top-Down Approach (queueing delay and loss); RFC 5681 (TCP congestion control, for context only).

---
# Demonstration Script
1. Introduce: "NetSim simulates one router with a finite FIFO queue to show congestion. It does not touch the real network."
2. Problem: packets arrive faster than the router can send; the excess waits, then is dropped.
3. Low: click Low, Start. Point to empty queue, 0 drops, Normal.
4. Moderate: click Medium. Queue builds and empties in bursts; delay rises.
5. Heavy: click High. Queue fills, red drops, loss and delay climb, status High.
6. Show the analysis box, then raise router rate to show recovery.
7. Click Run comparison and read the table.
8. Technologies: HTML, CSS, JavaScript, Chart.js. Limitations: single hop, no TCP, random traffic.

# Viva Questions
1. **What is congestion?** Arrival rate exceeds the capacity to forward, so queues grow and packets are lost.
2. **What is FIFO?** First packet in is first sent.
3. **What happens when the queue is full?** The new packet is dropped (tail drop).
4. **Latency vs throughput?** Latency is delay per packet; throughput is delivered rate.
5. **Why can throughput never exceed the router rate?** The router sends at most that many packets per second.
6. **How is packet loss computed?** Dropped / generated x 100.
7. **How is queueing delay measured?** Departure time minus arrival time, averaged.
8. **Why does delay rise near 100% load?** Random bursts create waiting even when average load is below capacity.
9. **Does a bigger buffer fix congestion?** It reduces drops but increases delay (bufferbloat).
10. **Is this TCP?** No. TCP congestion control (slow start, AIMD) is not implemented.
11. **What is packet switching?** Data is split into packets sharing links.
12. **Why Poisson arrivals?** A standard model for random independent arrivals.
13. **Why no backend?** All computation happens in the browser; nothing needs storing.
14. **How is congestion decided?** Utilization >= 80% or loss >= 5% is High; >= 40% or any drop is Moderate.
15. **How can congestion be reduced?** More capacity, less traffic, traffic shaping, active queue management.
16. **What is the conservation check?** Every generated packet is delivered, dropped or still queued.
