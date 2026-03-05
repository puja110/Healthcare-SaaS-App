import ReactMarkdown from "react-markdown";

interface SummaryDisplayProps {
  content: string;
}

interface Section {
  title: string;
  content: string;
  index: number;
}

function extractBulletItems(text: string): string[] {
  const numberedSplit = text.split(/(?=\d+\.\s)/);
  if (numberedSplit.length > 1) {
    return numberedSplit
      .map((item) => item.replace(/^\d+\.\s*/, "").trim())
      .filter(Boolean);
  }

  const bulletSplit = text.split(/\n+/);
  if (bulletSplit.length > 1) {
    return bulletSplit
      .map((item) => item.replace(/^[•\-\*]\s*/, "").trim())
      .filter(Boolean);
  }

  return [text.trim()].filter(Boolean);
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
              // FIX: Use ReactMarkdown for email so **bold** is rendered properly
              <div className="space-y-3">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => (
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {children}
                      </p>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-gray-900">
                        {children}
                      </strong>
                    ),
                    ul: ({ children }) => (
                      <ul className="space-y-2 my-2">{children}</ul>
                    ),
                    li: ({ children }) => (
                      <li className="flex items-start gap-3 text-sm text-gray-700">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                        <span className="flex-1">{children}</span>
                      </li>
                    ),
                  }}
                >
                  {section.content}
                </ReactMarkdown>
              </div>
            ) : (
              /* Bullet sections */
              <ul className="space-y-3">
                {extractBulletItems(section.content).map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700 leading-relaxed flex-1">
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