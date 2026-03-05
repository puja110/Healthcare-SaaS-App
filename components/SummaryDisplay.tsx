interface SummaryDisplayProps {
  content: string;
}

interface Section {
  title: string;
  content: string;
  index: number;
}

// Splits plain text into bullet items, handling both:
// - "1. Some text2. More text" (no newlines, numbers run together)
// - "• bullet" or "- bullet" style
// - Regular newline-separated lines
function extractBulletItems(text: string): string[] {
  // First try to split on numbered patterns like "1." "2." etc
  const numberedSplit = text.split(/(?=\d+\.\s)/);
  if (numberedSplit.length > 1) {
    return numberedSplit
      .map((item) => item.replace(/^\d+\.\s*/, "").trim())
      .filter(Boolean);
  }

  // Try bullet/dash style
  const bulletSplit = text.split(/\n+/);
  if (bulletSplit.length > 1) {
    return bulletSplit
      .map((item) => item.replace(/^[•\-\*]\s*/, "").trim())
      .filter(Boolean);
  }

  // Fallback: return as single item
  return [text.trim()].filter(Boolean);
}

// Splits email plain text into paragraphs
function extractEmailParagraphs(text: string): string[] {
  // Try newline splitting first
  const byNewline = text.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  if (byNewline.length > 1) return byNewline;

  // If it's all one block, split on sentence boundaries that look like paragraph starts
  // e.g. after punctuation followed by capital letter patterns like ".Dear" ".We " ".Your "
  const sentenceSplit = text
    .replace(/\.\s*(?=[A-Z][a-z])/g, ".\n")
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);

  return sentenceSplit.length > 1 ? sentenceSplit : [text];
}

export default function SummaryDisplay({ content }: SummaryDisplayProps) {
  const parseContent = (text: string): Section[] => {
    if (!text || typeof text !== "string" || text.trim() === "") return [];

    const sections: Section[] = [];
    const parts = text.split(/###\s+/);

    for (let i = 1; i < parts.length; i++) {
      const lines = parts[i].split("\n");
      const title = lines[0].trim();
      const contentLines = lines.slice(1).join("\n").trim();
      sections.push({ title, content: contentLines, index: i - 1 });
    }

    return sections;
  };

  if (!content || typeof content !== "string") {
    return (
      <div className="flex items-center justify-center h-full py-12">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-gray-500 text-lg">Generating summary...</p>
        </div>
      </div>
    );
  }

  const sections = parseContent(content);

  // Still streaming — no sections parsed yet
  if (sections.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <p className="text-sm text-gray-500 italic">Generating...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sections.map((section) => {
        const isEmail = section.index === 2;

        return (
          <div
            key={section.index}
            className="bg-white rounded-lg shadow-md p-6 border border-gray-200"
          >
            {/* Section Header */}
            <h2 className="text-base font-medium text-gray-900 mb-4 pb-3 border-b border-blue-400">
              {section.title}
            </h2>

            {isEmail ? (
              /* ── Email: split into readable paragraphs ── */
              <div className="space-y-3">
                {extractEmailParagraphs(section.content).map((para, i) => (
                  <p key={i} className="text-sm text-gray-700 leading-relaxed">
                    {para}
                  </p>
                ))}
              </div>
            ) : (
              /* ── Bullet sections: split numbered/plain items ── */
              <ul className="space-y-3">
                {extractBulletItems(section.content).map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700 leading-relaxed flex-1">
                      {/* Bold the label if it has "Label: value" pattern */}
                      {item.includes(": ") ? (
                        <>
                          <span className="font-medium text-gray-900">
                            {item.split(": ")[0]}:
                          </span>{" "}
                          {item.split(": ").slice(1).join(": ")}
                        </>
                      ) : (
                        item
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

// second
// import ReactMarkdown from "react-markdown";
// import remarkGfm from "remark-gfm";
// import remarkBreaks from "remark-breaks";

// interface SummaryDisplayProps {
//   content: string;
// }

// interface Section {
//   title: string;
//   content: string;
// }

// export default function SummaryDisplay({ content }: SummaryDisplayProps) {
//   const parseContent = (text: string): Section[] => {
//     if (!text || typeof text !== 'string' || text.trim() === '') {
//       return [];
//     }

//     const sections: Section[] = [];
//     const parts = text.split(/###\s+/);

//     for (let i = 1; i < parts.length; i++) {
//       const lines = parts[i].split("\n");
//       const title = lines[0].trim();
//       const contentLines = lines.slice(1).join("\n").trim();
//       sections.push({ title, content: contentLines });
//     }

//     return sections;
//   };

//   if (!content || typeof content !== 'string') {
//     return (
//       <div className="flex items-center justify-center h-full py-12">
//         <div className="text-center">
//           <div className="text-6xl mb-4">⏳</div>
//           <p className="text-gray-500 text-lg">Generating summary...</p>
//         </div>
//       </div>
//     );
//   }

//   const sections = parseContent(content);

//   if (sections.length === 0) {
//     return (
//       <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
//         <div className="text-sm font-normal text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
//           {content}
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-6">
//       {sections.map((section, index) => (
//         <div
//           key={index}
//           className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700"
//         >
//           {/* Section Header */}
//           <h2 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-4 pb-3 border-b border-blue-400">
//             {section.title}
//           </h2>

//           {/* Section Content */}
//           <div className={`${index < 2 ? "markdown-bullets" : "markdown-email"}`}>
//             <ReactMarkdown
//               remarkPlugins={[remarkGfm, remarkBreaks]}
//               components={{
//                 ul: ({ node, ...props }) => (
//                   <ul className="space-y-2 ml-2" {...props} />
//                 ),
//                 li: ({ node, ...props }) => (
//                   <li
//                     className="flex items-start text-sm font-normal text-gray-700 dark:text-gray-300"
//                     {...props}
//                   >
//                     <span className="mr-3 mt-1 text-blue-600 dark:text-blue-400 flex-shrink-0">
//                       •
//                     </span>
//                     <span className="flex-1">{props.children}</span>
//                   </li>
//                 ),
//                 p: ({ node, ...props }) => (
//                   <p
//                     className="text-sm font-normal text-gray-700 dark:text-gray-300 mb-3 leading-relaxed"
//                     {...props}
//                   />
//                 ),
//                 strong: ({ node, ...props }) => (
//                   <strong
//                     className="font-medium text-gray-800 dark:text-gray-200"
//                     {...props}
//                   />
//                 ),
//               }}
//             >
//               {section.content}
//             </ReactMarkdown>
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// }

// first
// import ReactMarkdown from "react-markdown";
// import remarkGfm from "remark-gfm";
// import remarkBreaks from "remark-breaks";

// interface SummaryDisplayProps {
//   content: string;
// }

// interface Section {
//   title: string;
//   content: string;
// }

// export default function SummaryDisplay({ content }: SummaryDisplayProps) {
//   // Parse the content into three sections
//   const parseContent = (text: string): Section[] => {
//     // Handle empty, undefined, or invalid text
//     if (!text || typeof text !== 'string' || text.trim() === '') {
//       return [];
//     }

//     const sections: Section[] = [];

//     // Split by ### headings
//     const parts = text.split(/###\s+/);

//     for (let i = 1; i < parts.length; i++) {
//       const lines = parts[i].split("\n");
//       const title = lines[0].trim();
//       const contentLines = lines.slice(1).join("\n").trim();
//       sections.push({ title, content: contentLines });
//     }

//     return sections;
//   };

//   // Handle loading/empty state
//   if (!content || typeof content !== 'string') {
//     return (
//       <div className="flex items-center justify-center h-full py-12">
//         <div className="text-center">
//           <div className="text-6xl mb-4">⏳</div>
//           <p className="text-gray-500 text-lg">Generating summary...</p>
//         </div>
//       </div>
//     );
//   }

//   const sections = parseContent(content);

//   // If no sections parsed yet (still streaming), show raw content
//   if (sections.length === 0) {
//     return (
//       <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
//         <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
//           {content}
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-8">
//       {sections.map((section, index) => (
//         <div
//           key={index}
//           className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700"
//         >
//           {/* Section Header */}
//           <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 pb-3 border-b-2 border-blue-500">
//             {section.title}
//           </h2>

//           {/* Section Content */}
//           <div
//             className={`${index < 2 ? "markdown-bullets" : "markdown-email"}`}
//           >
//             <ReactMarkdown
//               remarkPlugins={[remarkGfm, remarkBreaks]}
//               components={{
//                 // Custom rendering for list items in first two sections
//                 ul: ({ node, ...props }) => (
//                   <ul className="space-y-3 ml-2" {...props} />
//                 ),
//                 li: ({ node, ...props }) => (
//                   <li
//                     className="flex items-start text-gray-700 dark:text-gray-300"
//                     {...props}
//                   >
//                     <span className="mr-3 mt-1 text-blue-600 dark:text-blue-400 flex-shrink-0">
//                       •
//                     </span>
//                     <span className="flex-1">{props.children}</span>
//                   </li>
//                 ),
//                 // Custom rendering for email section
//                 p: ({ node, ...props }) => (
//                   <p
//                     className="text-gray-700 dark:text-gray-300 mb-3 leading-relaxed"
//                     {...props}
//                   />
//                 ),
//                 strong: ({ node, ...props }) => (
//                   <strong
//                     className="font-semibold text-gray-900 dark:text-gray-100"
//                     {...props}
//                   />
//                 ),
//               }}
//             >
//               {section.content}
//             </ReactMarkdown>
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// }