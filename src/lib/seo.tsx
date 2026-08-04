import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: string;
  jsonLd?: Record<string, unknown>;
}

export const SEO = ({ title, description, image, url, type = "website", jsonLd }: SEOProps) => {
  const fullTitle = title.length > 55 ? title : `${title} | Tart`;
  const canonicalUrl = url || (typeof window !== "undefined" ? window.location.href : "");
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description.slice(0, 158)} />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description.slice(0, 158)} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      {image && <meta property="og:image" content={image} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description.slice(0, 158)} />
      {image && <meta name="twitter:image" content={image} />}
      {/* GEO meta */}
      <meta name="geo.region" content="IN" />
      <meta name="geo.placename" content="India" />
      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </Helmet>
  );
};
