import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

interface SummaryDisplayProps {
  content: string;
}

interface Section {
  title: string;
  content: string;
}

export default function SummaryDisplay({ content }: SummaryDisplayProps) {
  // Parse the content into three sections
  const parseContent = (text: string): Section[] => {
    const sections: Section[] = [];

    // Split by ### headings
    const parts = text.split(/###\s+/);

    for (let i = 1; i < parts.length; i++) {
      const lines = parts[i].split("\n");
      const title = lines[0].trim();
      const content = lines.slice(1).join("\n").trim();
      sections.push({ title, content });
    }

    return sections;
  };

  const sections = parseContent(content);

  return (
    <div className="space-y-8">
      {sections.map((section, index) => (
        <div
          key={index}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700"
        >
          {/* Section Header */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 pb-3 border-b-2 border-blue-500">
            {section.title}
          </h2>

          {/* Section Content */}
          <div
            className={`${index < 2 ? "markdown-bullets" : "markdown-email"}`}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkBreaks]}
              components={{
                // Custom rendering for list items in first two sections
                ul: ({ node, ...props }) => (
                  <ul className="space-y-3 ml-2" {...props} />
                ),
                li: ({ node, ...props }) => (
                  <li
                    className="flex items-start text-gray-700 dark:text-gray-300"
                    {...props}
                  >
                    <span className="mr-3 mt-1 text-blue-600 dark:text-blue-400 flex-shrink-0">
                      •
                    </span>
                    <span className="flex-1">{props.children}</span>
                  </li>
                ),
                // Custom rendering for email section
                p: ({ node, ...props }) => (
                  <p
                    className="text-gray-700 dark:text-gray-300 mb-3 leading-relaxed"
                    {...props}
                  />
                ),
                strong: ({ node, ...props }) => (
                  <strong
                    className="font-semibold text-gray-900 dark:text-gray-100"
                    {...props}
                  />
                ),
              }}
            >
              {section.content}
            </ReactMarkdown>
          </div>
        </div>
      ))}
    </div>
  );
}
