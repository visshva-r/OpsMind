import type { IndustrialDocument } from "./types";

export const SEED_DOCUMENTS: IndustrialDocument[] = [
  {
    id: "doc-sop-p101",
    title: "Centrifugal Pump P-101 Preventive Maintenance SOP",
    type: "SOP",
    equipmentTags: ["P-101", "Centrifugal Pump", "Cooling Water System"],
    regulatoryRefs: ["OISD-GDN-118", "Factory Act Sec 40B"],
    lastUpdated: "2025-11-12",
    content: `Scope: Applies to Cooling Water Pump P-101 in Unit-2.
Inspection Frequency: Weekly vibration check; monthly seal inspection; quarterly alignment verification.
Critical Limits: Bearing temperature must remain below 75°C. Vibration velocity must not exceed 7.1 mm/s RMS.
Seal Leakage: Any visible seal leakage above 5 drops/minute requires immediate isolation and maintenance work order.
Spare Parts: Mechanical seal kit MSK-P101-A, bearing set BRG-6314-C3.
Isolation Procedure: Close suction valve V-101A, discharge valve V-101B, and apply LOTO on MCC panel CP-2B before opening casing.
Historical Note: Three repeat failures in 2024 were traced to delayed seal replacement after minor leakage was ignored.`,
  },
  {
    id: "doc-wo-p101",
    title: "Work Order History – Pump P-101 (Last 12 Months)",
    type: "Work Order",
    equipmentTags: ["P-101", "Mechanical Seal", "Bearing"],
    regulatoryRefs: [],
    lastUpdated: "2026-01-08",
    content: `WO-24091 (2025-03-14): Replaced mechanical seal after temperature rise to 82°C. Root cause: seal face wear.
WO-24156 (2025-06-02): Bearing replacement due to high vibration (9.2 mm/s). Misalignment suspected.
WO-24288 (2025-09-19): Temporary seal leak arrest; permanent seal change deferred due to production pressure.
WO-24390 (2025-12-04): Coupling alignment corrected after post-maintenance startup vibration spike.
Pattern: Recurring seal and vibration issues suggest incomplete RCA after WO-24288 and missed alignment verification.`,
  },
  {
    id: "doc-inspection-p101",
    title: "Monthly Inspection Report – P-101 (December 2025)",
    type: "Inspection",
    equipmentTags: ["P-101", "Vibration", "Seal"],
    regulatoryRefs: ["OISD-GDN-118"],
    lastUpdated: "2025-12-28",
    content: `Inspector: Maintenance Team B
Findings:
1. Vibration measured at 8.4 mm/s on drive end bearing (limit 7.1 mm/s).
2. Seal housing shows intermittent drip at 3 drops/min.
3. Baseplate grouting crack observed near suction flange.
4. Lubrication schedule last completed 45 days ago (monthly required).
Recommendation: Raise priority work order, perform alignment check, replace seal before next turnaround.`,
  },
  {
    id: "doc-manual-p101",
    title: "OEM Manual Excerpt – Centrifugal Pump Model CPX-450",
    type: "Manual",
    equipmentTags: ["P-101", "CPX-450", "Alignment"],
    regulatoryRefs: [],
    lastUpdated: "2023-04-10",
    content: `Model CPX-450 maximum continuous speed: 2980 RPM.
Alignment tolerance: Angular misalignment <= 0.05 mm/100 mm; parallel offset <= 0.05 mm.
Seal flush plan 11 requires minimum flush flow 2.5 m3/h.
Common failure mode: Dry running for > 90 seconds causes seal face damage and secondary bearing failure within 72 hours.
Startup checklist: Verify suction pressure, vent casing, confirm seal flush line open, check coupling guard installed.`,
  },
  {
    id: "doc-permit-hotwork",
    title: "Permit-to-Work Procedure – Hot Work Near Process Areas",
    type: "Procedure",
    equipmentTags: ["Hot Work", "Gas Detection", "Confined Space"],
    regulatoryRefs: ["OISD-STD-117", "Factory Act Rule 68"],
    lastUpdated: "2025-08-01",
    content: `Hot work permits require continuous gas monitoring when work occurs within 15 meters of hydrocarbon lines.
Simultaneous Operations (SIMOPS): Hot work cannot proceed if LEL exceeds 10% in adjacent zones.
Mandatory checks: Fire watch assigned, extinguisher within 10 m, adjacent equipment depressurized where feasible.
Digital permit must cross-check active maintenance on nearby equipment tags before approval.`,
  },
  {
    id: "doc-nearmiss-cs",
    title: "Near Miss Report – Confined Space Entry (Unit-2)",
    type: "Incident",
    equipmentTags: ["V-220", "Confined Space", "Gas Detector"],
    regulatoryRefs: ["OISD-STD-163", "Factory Act Sec 36"],
    lastUpdated: "2025-10-03",
    content: `Event: Technician entered V-220 vessel during concurrent purging operation without updated permit.
Observed Conditions: O2 at 19.1%, H2S at 6 ppm, LEL at 8%.
Outcome: No injury; entry stopped after 4 minutes.
Contributing Factors: Permit not revalidated after process upset; gas detector calibration overdue by 18 days.
Corrective Actions Required: Enforce permit revalidation on process change; auto-block entry if detector calibration expired.`,
  },
  {
    id: "doc-oistd-safety",
    title: "OISD-GDN-118 – Rotating Equipment Safety Guidelines (Excerpt)",
    type: "Regulatory",
    equipmentTags: ["Rotating Equipment", "P-101", "Guarding"],
    regulatoryRefs: ["OISD-GDN-118"],
    lastUpdated: "2024-02-15",
    content: `Rotating equipment must have guard integrity verified before every restart after maintenance.
Vibration monitoring frequency shall not exceed 30 days for critical service pumps.
Any excursion beyond alarm limit requires documented investigation within 24 hours.
Records of alignment, balancing, and seal replacement must be retained for minimum 5 years.`,
  },
  {
    id: "doc-factory-act",
    title: "Factory Act Compliance Checklist – Maintenance & Safety Records",
    type: "Regulatory",
    equipmentTags: ["Compliance", "Maintenance Records"],
    regulatoryRefs: ["Factory Act Sec 40B", "Factory Act Rule 68"],
    lastUpdated: "2025-07-20",
    content: `Sec 40B: All dangerous machinery must have logbook entries for inspection, maintenance, and abnormal events.
Rule 68: Work permit system mandatory for maintenance in hazardous areas.
Audit Evidence Required: Signed inspection reports, LOTO records, gas test sheets, and closure notes for each work order.
Non-compliance observed when inspection overdue > 15 days or permit revalidation missing after process change.`,
  },
  {
    id: "doc-rca-boiler",
    title: "RCA Template – Boiler Trip Event B-401",
    type: "Procedure",
    equipmentTags: ["B-401", "Boiler", "RCA"],
    regulatoryRefs: ["OISD-GDN-126"],
    lastUpdated: "2025-05-11",
    content: `RCA Steps:
1. Define problem statement with measurable impact.
2. Collect timeline from DCS, work orders, and operator logs.
3. Identify physical, human, and systemic causes.
4. Validate with SME review.
5. Assign corrective and preventive actions with due dates.
For repeat failures within 90 days, escalate to site reliability board.`,
  },
  {
    id: "doc-cooling-tower",
    title: "Operating Procedure – Cooling Tower CT-02 and Associated Pumps",
    type: "SOP",
    equipmentTags: ["CT-02", "P-101", "P-102", "Cooling Water"],
    regulatoryRefs: [],
    lastUpdated: "2025-09-30",
    content: `Cooling Tower CT-02 supplies P-101 and P-102 in parallel.
Minimum flow through P-101: 180 m3/h to avoid seal damage.
If CT-02 basin level drops below 1.2 m, reduce load and inspect strainers on P-101 suction.
Seasonal algae fouling increases vibration and temperature; chemical dosing logs must be reviewed weekly.`,
  },
  {
    id: "doc-inspection-compressor",
    title: "Inspection Report – Air Compressor AC-07 (November 2025)",
    type: "Inspection",
    equipmentTags: ["AC-07", "Compressor", "Pressure Vessel"],
    regulatoryRefs: ["PESO", "Factory Act Sec 40B"],
    lastUpdated: "2025-11-22",
    content: `Discharge temperature trending high at 108°C (alarm 110°C).
Safety valve test certificate expires in 22 days.
Intercooler drain interval exceeded by 9 days.
Risk: Delayed drain may cause moisture carryover and downstream corrosion.`,
  },
  {
    id: "doc-pid-excerpt",
    title: "P&ID Excerpt – Unit-2 Cooling Water Circuit",
    type: "Manual",
    equipmentTags: ["P-101", "P-102", "V-101A", "V-101B", "CT-02"],
    regulatoryRefs: [],
    lastUpdated: "2022-11-05",
    content: `P-101 suction from CT-02 basin via strainer ST-101.
Discharge to process exchangers E-201 and E-202.
Isolation valves: V-101A (suction), V-101B (discharge).
Minimum line size downstream: 6 inch; check valve CV-101 prevents backflow.
Note: Shared header with P-102; simultaneous maintenance requires bypass line BL-101 open.`,
  },
];
