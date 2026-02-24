import ResponseHeader from './ResponseHeader';
import NarrativeSection from './NarrativeSection';
import MediaCallout from './MediaCallout';
import ConnectionHighlight from './ConnectionHighlight';
import NextQuestions from './NextQuestions';

const SECTION_COMPONENTS = {
  narrative: ({ data }) => <NarrativeSection text={data.text} />,
  media_callout: ({ data }) => (
    <MediaCallout
      media_type={data.media_type}
      url={data.url}
      title={data.title}
      context={data.context}
      timestamp={data.timestamp}
    />
  ),
  connection_highlight: ({ data, onEntityTap }) => (
    <ConnectionHighlight
      entity={data.entity}
      relationship={data.relationship}
      follow_up_query={data.follow_up_query}
      image_url={data.image_url}
      onTap={onEntityTap}
    />
  ),
};

export default function ContentRenderer({ apiResponse, onFollowUp, onEntityTap }) {
  if (!apiResponse) return null;

  const content = apiResponse.content;
  const hasStructuredContent = content && Array.isArray(content.sections) && content.sections.length > 0;

  // Fallback: render plain narrative text
  if (!hasStructuredContent) {
    if (!apiResponse.narrative) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <NarrativeSection text={apiResponse.narrative} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ResponseHeader headline={content.headline} summary={content.summary} />

      {content.sections.map((section, i) => {
        const Renderer = SECTION_COMPONENTS[section.type];
        if (!Renderer) return null;
        return <Renderer key={i} data={section} onEntityTap={onEntityTap} />;
      })}

      {content.next_questions && (
        <NextQuestions questions={content.next_questions} onSelect={onFollowUp} />
      )}
    </div>
  );
}
