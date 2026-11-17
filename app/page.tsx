import Image from "next/image";
import AffairsCounter from "@/components/AffairsCounter";
import CoverIntro from "@/components/CoverIntro";
import DisclaimerCrawl from "@/components/DisclaimerCrawl";
import Headlines from "@/components/Headlines";
import MarketPage from "@/components/MarketPage";
import Masthead from "@/components/Masthead";
import PageGate from "@/components/PageGate";
import ScandalRibbon from "@/components/ScandalRibbon";
import { BreakingBox, QuoteProvider } from "@/components/LiveQuote";
import { Barcode, Starburst, SubheadBox } from "@/components/Decorations";
import jensen from "@/public/jensen-cutout.png";

export default function Home() {
  return (
    <QuoteProvider>
      <PageGate>
        <DisclaimerCrawl />
        <CoverIntro>
          <div className="cover__top">
            <Masthead />
            <BreakingBox />
          </div>

          <div className="cover__photo">
            <div className="story">
              <Starburst />
              <AffairsCounter />
              <div className="cover__bottom">
                <SubheadBox />
                <Barcode />
              </div>
            </div>

            <div className="hero">
              <div className="hero__frame">
                <Image
                  src={jensen}
                  alt="Jensen Huang in his leather jacket, holding up a chip"
                  priority
                  className="hero__img"
                  sizes="(min-width: 1024px) 50vw, 100vw"
                />
                <div className="hero__halftone" aria-hidden="true" />
              </div>
            </div>
          </div>
        </CoverIntro>
        <ScandalRibbon />
        <MarketPage />
        <Headlines />
      </PageGate>
    </QuoteProvider>
  );
}
