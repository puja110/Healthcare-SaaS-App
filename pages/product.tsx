"use client";

import { useState, FormEvent } from "react";
import DatePicker from "react-datepicker";
import SummaryDisplay from "../components/SummaryDisplay";
import "react-datepicker/dist/react-datepicker.css";

function ConsultationForm() {
  // Form state
  const [patientName, setPatientName] = useState("");
  const [visitDate, setVisitDate] = useState<Date | null>(new Date());
  const [notes, setNotes] = useState("");

  // Response state
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setOutput("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patient_name: patientName,
          date_of_visit: visitDate?.toISOString().slice(0, 10),
          notes,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate summary");
      }

      const data = await response.json();

      // Set the content from the response
      if (data.content) {
        setOutput(data.content);
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      console.error("Error:", err);
      setError(
        "An error occurred while generating the summary. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        Consultation Notes
      </h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8"
      >
        <div className="space-y-2">
          <label
            htmlFor="patient"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Patient Name
          </label>
          <input
            id="patient"
            type="text"
            required
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            placeholder="Enter patient's full name"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="date"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Date of Visit
          </label>
          <DatePicker
            id="date"
            selected={visitDate}
            onChange={(d: Date | null) => setVisitDate(d)}
            dateFormat="yyyy-MM-dd"
            placeholderText="Select date"
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Consultation Notes
          </label>
          <textarea
            id="notes"
            required
            rows={8}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            placeholder="Enter detailed consultation notes..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
        >
          {loading ? "Generating Summary..." : "Generate Summary"}
        </button>
      </form>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-8">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Output Display */}
      {output && (
        <section className="mt-8">
          <SummaryDisplay content={output} />
        </section>
      )}
    </div>
  );
}

export default function Product() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header className="text-center py-6 mb-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
          MediNotes Pro
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-base">
          AI-Powered Medical Consultation Summaries
        </p>
      </header>
      <ConsultationForm />
    </main>
  );
}

// "use client";

// import { useState, FormEvent } from "react";
// import DatePicker from "react-datepicker";
// import { fetchEventSource } from "@microsoft/fetch-event-source";
// import SummaryDisplay from "../components/SummaryDisplay";

// function ConsultationForm() {
//   // Form state
//   const [patientName, setPatientName] = useState("");
//   const [visitDate, setVisitDate] = useState<Date | null>(new Date());
//   const [notes, setNotes] = useState("");

//   // Streaming state
//   const [output, setOutput] = useState("");
//   const [loading, setLoading] = useState(false);

//   async function handleSubmit(e: FormEvent) {
//     e.preventDefault();
//     setOutput("");
//     setLoading(true);

//     const controller = new AbortController();
//     let buffer = "";

//     await fetchEventSource("/api/consultation", {
//       signal: controller.signal,
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         patient_name: patientName,
//         date_of_visit: visitDate?.toISOString().slice(0, 10),
//         notes,
//       }),
//       onmessage(ev) {
//         buffer += ev.data;
//         setOutput(buffer);
//       },
//       onclose() {
//         setLoading(false);
//       },
//       onerror(err) {
//         console.error("SSE error:", err);
//         setOutput(
//           "An error occurred while generating the summary. Please try again.",
//         );
//         controller.abort();
//         setLoading(false);
//       },
//     });
//   }

//   return (
//     <div className="container mx-auto px-4 py-8 max-w-5xl">
//       <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
//         Consultation Notes
//       </h1>

//       <form
//         onSubmit={handleSubmit}
//         className="space-y-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8"
//       >
//         <div className="space-y-2">
//           <label
//             htmlFor="patient"
//             className="block text-sm font-medium text-gray-700 dark:text-gray-300"
//           >
//             Patient Name
//           </label>
//           <input
//             id="patient"
//             type="text"
//             required
//             value={patientName}
//             onChange={(e) => setPatientName(e.target.value)}
//             className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
//             placeholder="Enter patient's full name"
//           />
//         </div>

//         <div className="space-y-2">
//           <label
//             htmlFor="date"
//             className="block text-sm font-medium text-gray-700 dark:text-gray-300"
//           >
//             Date of Visit
//           </label>
//           <DatePicker
//             id="date"
//             selected={visitDate}
//             onChange={(d: Date | null) => setVisitDate(d)}
//             dateFormat="yyyy-MM-dd"
//             placeholderText="Select date"
//             required
//             className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
//           />
//         </div>

//         <div className="space-y-2">
//           <label
//             htmlFor="notes"
//             className="block text-sm font-medium text-gray-700 dark:text-gray-300"
//           >
//             Consultation Notes
//           </label>
//           <textarea
//             id="notes"
//             required
//             rows={8}
//             value={notes}
//             onChange={(e) => setNotes(e.target.value)}
//             className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
//             placeholder="Enter detailed consultation notes..."
//           />
//         </div>

//         <button
//           type="submit"
//           disabled={loading}
//           className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
//         >
//           {loading ? "Generating Summary..." : "Generate Summary"}
//         </button>
//       </form>

//       {/* Updated Output Display */}
//       {output && (
//         <section className="mt-8">
//           <SummaryDisplay content={output} />
//         </section>
//       )}
//     </div>
//   );
// }

// export default function Product() {
//   return (
//     <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
//       <header className="text-center py-6 mb-2">
//         <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
//           MediNotes Pro
//         </h1>
//         <p className="text-gray-600 dark:text-gray-400 text-base">
//           Streamline your patient consultations with AI-powered summaries
//         </p>
//       </header>
//       <ConsultationForm />
//     </main>
//   );
// }
