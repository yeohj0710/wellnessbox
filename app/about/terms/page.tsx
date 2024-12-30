"use client";

export default function Terms() {
  return (
    <div className="mt-8 mb-12 w-full max-w-[640px] mx-auto px-6 py-10 bg-white sm:border sm:border-gray-200 sm:rounded-lg sm:shadow-lg">
      <h1 className="text-xl font-bold text-gray-800 mb-10 text-center">
        이용약관
      </h1>
      <div className="text-gray-700 leading-relaxed">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          제1조 (목적)
        </h2>
        <p className="mb-6">
          본 약관은 웰니스박스(이하 "회사")가 제공하는 건강기능식품 소분 판매
          플랫폼 서비스의 이용 조건 및 절차, 기타 필요한 사항을 규정함을
          목적으로 합니다.
        </p>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          제2조 (정의)
        </h2>
        <p className="mb-6">
          본 약관에서 사용하는 주요 용어의 정의는 다음과 같습니다:
        </p>
        <ul className="list-disc pl-6 mb-6">
          <li>
            "서비스"란 회사가 제공하는 건강기능식품 소분 판매 및 관련 온라인
            플랫폼 서비스를 말합니다.
          </li>
          <li>"이용자"란 본 약관에 따라 서비스를 이용하는 고객을 말합니다.</li>
          <li>
            "계정"이란 이용자가 서비스를 이용하기 위해 설정한 고유한 아이디와
            비밀번호를 말합니다.
          </li>
        </ul>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          제3조 (약관의 게시 및 변경)
        </h2>
        <p className="mb-6">
          1. 본 약관은 서비스 초기 화면에 게시하여, 이용자가 확인할 수 있도록
          합니다.
          <br />
          2. 회사는 필요시 관련 법령을 위배하지 않는 범위에서 약관을 변경할 수
          있습니다.
          <br />
          3. 변경된 약관은 공지 후 적용됩니다. 이용자가 변경된 약관에 동의하지
          않을 경우, 이용자는 서비스 이용을 중단할 수 있습니다.
        </p>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          제4조 (서비스의 제공 및 변경)
        </h2>
        <p className="mb-6">1. 회사는 다음과 같은 서비스를 제공합니다:</p>
        <ul className="list-disc pl-6 mb-6">
          <li>건강기능식품 소분 및 판매</li>
          <li>제품 추천 및 개인화 서비스</li>
          <li>기타 회사가 정하는 서비스</li>
        </ul>
        <p className="mb-6">
          2. 회사는 필요에 따라 제공하는 서비스의 내용을 변경할 수 있으며, 변경
          사항은 사전에 공지합니다.
        </p>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          제5조 (이용자의 의무)
        </h2>
        <p className="mb-6">이용자는 다음의 행위를 하여서는 안 됩니다:</p>
        <ul className="list-disc pl-6 mb-6">
          <li>타인의 계정을 도용하거나 부정 사용하는 행위</li>
          <li>서비스의 운영을 방해하거나 안정성을 저해하는 행위</li>
          <li>허위 정보를 제공하거나 부정한 목적으로 서비스를 이용하는 행위</li>
          <li>기타 불법적이거나 부당한 행위</li>
        </ul>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          제6조 (책임의 제한)
        </h2>
        <p className="mb-6">
          1. 회사는 이용자의 귀책 사유로 인한 서비스 이용의 장애에 대해 책임을
          지지 않습니다.
          <br />
          2. 회사는 서비스에서 제공하는 정보의 신뢰성, 정확성에 대해 보증하지
          않습니다.
          <br />
          3. 회사는 건강기능식품 소분 판매 과정에서 발생할 수 있는 알러지 반응
          등 개인적인 문제에 대해 책임을 지지 않습니다. 이용자는 제품 상세
          정보를 반드시 확인해야 합니다.
        </p>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          제7조 (기타)
        </h2>
        <p>본 약관에서 정하지 않은 사항은 관계법령과 상관례에 따릅니다.</p>
      </div>
    </div>
  );
}
