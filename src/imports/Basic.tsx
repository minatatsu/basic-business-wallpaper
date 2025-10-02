import svgPaths from "./svg-90zijtv86r";
import imgQr from "figma:asset/4abc8d76edd6edf508223e17be0a6d249a26ffbe.png";

function Bg() {
  return (
    <div className="absolute contents right-0 top-0" data-name="bg">
      <div className="absolute bottom-[-1px] flex h-[674px] items-center justify-center right-[0.54px] w-[894.462px]">
        <div className="flex-none rotate-[180deg] scale-y-[-100%]">
          <div className="h-[674px] relative w-[894.462px]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 895 674">
              <path d={svgPaths.p155f8fe0} fill="var(--fill-0, #234C87)" id="Polygon 4" />
            </svg>
          </div>
        </div>
      </div>
      <div className="absolute flex h-[686px] items-center justify-center right-0 top-0 w-[431.241px]">
        <div className="flex-none rotate-[180deg]">
          <div className="h-[686px] relative w-[431.241px]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 432 686">
              <g id="Polygon 3">
                <path d={svgPaths.p39d23980} fill="var(--fill-0, #D0DFF4)" style={{ mixBlendMode: "multiply" }} />
              </g>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function Qr() {
  return (
    <div className="absolute h-[331px] right-[95px] top-[685px] w-[280px]" data-name="QR">
      <div className="absolute left-0 pointer-events-none rounded-[10px] size-[280px] top-0" data-name="QR">
        <img alt="" className="absolute inset-0 max-w-none object-50%-50% object-cover rounded-[10px] size-full" src={imgQr} />
        <div aria-hidden="true" className="absolute border border-black border-solid inset-0 rounded-[10px]" />
      </div>
      <p className="absolute font-['Noto_Sans_JP:Regular',_sans-serif] font-normal leading-[normal] left-[140px] text-[32px] text-center text-white top-[290px] translate-x-[-50%] w-[280px]">basicinc.jp</p>
    </div>
  );
}

function Frame54262() {
  return (
    <div className="content-stretch flex font-['Noto_Sans_JP:Black',_sans-serif] font-black gap-[64px] items-center justify-end leading-[normal] relative shrink-0 text-[135px] text-neutral-900 text-nowrap tracking-[13.5px] whitespace-pre">
      <p className="relative shrink-0">田中</p>
      <p className="relative shrink-0">太郎</p>
    </div>
  );
}

function Frame54263() {
  return (
    <div className="content-stretch flex font-['Noto_Sans_JP:Bold',_sans-serif] font-bold gap-[48px] items-center justify-center leading-[normal] relative shrink-0 text-[54px] text-neutral-900 text-nowrap text-right tracking-[5.4px] uppercase whitespace-pre">
      <p className="relative shrink-0">TANAKA</p>
      <p className="relative shrink-0">TARO</p>
    </div>
  );
}

function Frame1() {
  return (
    <div className="content-stretch flex flex-col gap-[24px] items-end relative shrink-0">
      <Frame54262 />
      <Frame54263 />
    </div>
  );
}

function Name() {
  return (
    <div className="content-stretch flex flex-col gap-[24px] h-[185px] items-start relative shrink-0" data-name="name">
      <Frame1 />
    </div>
  );
}

function Frame54269() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0">
      <p className="relative shrink-0">◯◯◯部</p>
      <p className="relative shrink-0">◯◯◯部</p>
    </div>
  );
}

function Frame() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-end justify-center relative shrink-0" data-name="frame">
      <Frame54269 />
      <p className="relative shrink-0">◯◯◯グループ</p>
    </div>
  );
}

function Team() {
  return (
    <div className="content-stretch flex flex-col font-['Noto_Sans_JP:Bold',_sans-serif] font-bold gap-[8px] items-end leading-[normal] relative shrink-0 text-[38px] text-neutral-900 text-nowrap whitespace-pre" data-name="team">
      <Frame />
      <p className="relative shrink-0 text-right">役職が入ります</p>
    </div>
  );
}

function Profile() {
  return (
    <div className="content-stretch flex flex-col gap-[30px] items-end relative shrink-0 w-full" data-name="profile">
      <Name />
      <Team />
    </div>
  );
}

function Info() {
  return (
    <div className="absolute box-border content-stretch flex flex-col gap-[36px] items-start right-[98px] shadow-[0px_0px_20px_0px_#ffffff,0px_0px_15px_0px_#ffffff] top-[135px]" data-name="info">
      <Profile />
    </div>
  );
}

export default function Basic() {
  return (
    <div className="bg-white relative size-full" data-name="basic">
      <Bg />
      <Qr />
      <Info />
      <div className="absolute h-[102px] left-[105px] top-[908px] w-[235px]" data-name="全社">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 235 102">
          <g id="å¨ç¤¾">
            <path d={svgPaths.p1a1f2e40} fill="var(--fill-0, #024287)" />
            <path d={svgPaths.p2be5d080} fill="var(--fill-0, #024287)" />
            <path d={svgPaths.p25220d70} fill="var(--fill-0, #024287)" />
            <path d={svgPaths.p3ae78f00} fill="var(--fill-0, #024287)" />
            <path d={svgPaths.p150b3080} fill="var(--fill-0, #024287)" />
            <path d={svgPaths.p37c65000} fill="var(--fill-0, #024287)" />
            <path d={svgPaths.p35ad6ca0} fill="var(--fill-0, #024287)" />
            <path d={svgPaths.p1ee24680} fill="var(--fill-0, #024287)" />
            <path d={svgPaths.pa4cfd00} fill="var(--fill-0, #024287)" />
            <path d={svgPaths.p3b4d4e00} fill="var(--fill-0, #024287)" />
            <path d={svgPaths.p2c9ab200} fill="var(--fill-0, #024287)" />
            <path d={svgPaths.p15e95500} fill="var(--fill-0, #024287)" />
            <path d={svgPaths.p1b01b00} fill="var(--fill-0, #024287)" />
            <path d={svgPaths.p367aad00} fill="var(--fill-0, #024287)" />
            <path d={svgPaths.p2bcb3d00} fill="var(--fill-0, #024287)" />
          </g>
        </svg>
      </div>
    </div>
  );
}