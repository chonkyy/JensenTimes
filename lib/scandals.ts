/**
 * The scandal ledger, per public reporting as of November 17, 2026.
 * Single source of truth for the cover tally and the ribbon below it.
 *
 * Keep the wording neutral ("reported", "alleged"): these are real people and,
 * apart from Jensen's own admission, nothing here has been confirmed.
 *
 * Photos: this is a private, unpublished build, so the cards use press photos
 * (credited) saved to public/people/. Don't publish the site with these: swap
 * in freely licensed images or drop `photo` (falls back to a silhouette).
 * Person 3 is unnamed in reporting; do not guess who it is.
 */

export type ScandalStatus = "admitted" | "alleged";

export type Source = { outlet: string; date: string; url: string };

export type Person = {
  id: string;
  status: ScandalStatus;
  /** null when reporting doesn't name them */
  name: string | null;
  role: string;
  summary: string;
  response: string;
  sources: Source[];
  photo?: { src: string; credit: string; license: string; /** CSS object-position for the face */ focus?: string };
};

export const PEOPLE: Person[] = [
  {
    id: "alice-huang",
    status: "admitted",
    name: "Alice Huang",
    role: "Former CEO of Megaspeed, a Singapore data-center firm (no relation)",
    summary:
      "Named by the FT and NYT as the other party in the affair Jensen admitted. US officials reportedly believe she was recruited by China's Ministry of State Security.",
    response:
      "Jensen's Nov 8 note to staff admits he was “unfaithful” but names no one. The spy claims are unproven; China calls them a smear.",
    sources: [
      {
        outlet: "CNN",
        date: "Nov 8, 2026",
        url: "https://www.cnn.com/2026/11/08/business/nvidia-investigation-ceo-jensen-huang",
      },
      {
        outlet: "NPR",
        date: "Nov 12, 2026",
        url: "https://www.npr.org/2026/11/12/nx-s1-6039266/jensen-huang-china-honey-trap-nvidia-spies-sex-alice-huang",
      },
    ],
    photo: {
      src: "/people/alice-huang.jpg",
      credit: "CTI via Reuters TV",
      license: "AFP",
      focus: "45% 30%",
    },
  },
  {
    id: "kimberly-powell",
    status: "alleged",
    name: "Kimberly Powell",
    role: "NVIDIA VP of Healthcare, who reported to Huang",
    summary:
      "The New York Times, citing five people who worked at NVIDIA, reported the two were seen “being affectionate” at a San Jose hotel.",
    response: "Neither has confirmed it. Jensen to the Times: “I don't think you should be talking to me directly.”",
    sources: [
      {
        outlet: "TechCrunch",
        date: "Nov 11, 2026",
        url: "https://techcrunch.com/2026/11/11/jensen-huang-accused-of-having-another-affair-with-a-nvidia-exec/",
      },
    ],
    photo: { src: "/people/kimberly-powell.jpg", credit: "NVIDIA", license: "press headshot", focus: "50% 20%" },
  },
  {
    id: "unnamed-employee",
    status: "alleged",
    name: null,
    role: "A second NVIDIA employee",
    summary: "Reuters reported an “intimate relationship” with another NVIDIA employee, citing sources.",
    response: "NVIDIA declined to comment. The employee has not been named.",
    sources: [
      {
        outlet: "Forbes",
        date: "Nov 12, 2026",
        url: "https://www.forbes.com/sites/alisondurkee/2026/11/12/jensen-huang-had-a-third-affair-with-another-nvidia-employee-report-says/",
      },
    ],
  },
];

export const ADMITTED_PEOPLE = PEOPLE.filter((p) => p.status === "admitted");
export const ALLEGED_PEOPLE = PEOPLE.filter((p) => p.status === "alleged");
export const ADMITTED = ADMITTED_PEOPLE.length;
export const ALLEGED = ALLEGED_PEOPLE.length;

/**
 * Dated moments for the money page's chart pins. These only mark *when* something was reported;
 * the page never claims a story moved the stock. One pin per calendar day (New York time).
 */
export type MarketEvent = { id: string; /** YYYY-MM-DD, New York */ date: string; label: string; sources: Source[] };

const src = (personId: string, outlet: string) => {
  const s = PEOPLE.find((p) => p.id === personId)?.sources.find((x) => x.outlet === outlet);
  if (!s) throw new Error(`scandals: no ${outlet} source on ${personId}`);
  return s;
};

export const MARKET_EVENTS: MarketEvent[] = [
  {
    id: "admission",
    date: "2026-11-08",
    label: "Jensen admits he was “unfaithful”",
    sources: [src("alice-huang", "CNN")],
  },
  {
    id: "second",
    date: "2026-11-11",
    label: "NYT reports a second alleged affair",
    sources: [src("kimberly-powell", "TechCrunch")],
  },
  {
    id: "third",
    date: "2026-11-12",
    label: "A third alleged relationship reported; unproven spy claims",
    sources: [src("unnamed-employee", "Forbes"), src("alice-huang", "NPR")],
  },
];
