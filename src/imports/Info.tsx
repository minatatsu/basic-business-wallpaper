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

function Frame54265() {
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
      <Frame54265 />
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

export default function Info() {
  return (
    <div className="box-border content-stretch flex flex-col gap-[36px] items-start relative shadow-[0px_0px_20px_0px_#ffffff,0px_0px_15px_0px_#ffffff] size-full" data-name="info">
      <Profile />
    </div>
  );
}