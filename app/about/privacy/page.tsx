"use client";

export default function Privacy() {
  return (
    <div className="mt-8 mb-12 w-full max-w-[640px] mx-auto px-6 py-10 bg-white sm:border sm:border-gray-200 sm:rounded-lg sm:shadow-lg">
      <h1 className="text-xl font-bold text-gray-800 mb-10 text-center">
        개인정보처리방침
      </h1>
      <div className="text-gray-700 leading-relaxed">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          제1조 (목적)
        </h2>
        <p className="mb-6">
          웰니스박스(이하 &quot;회사&quot;)는 이용자의 개인정보를 보호하고,
          개인정보와 관련한 법령을 준수하기 위하여 본 개인정보처리방침을
          제정하여 운영하고 있습니다.
        </p>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          제2조 (수집하는 개인정보의 항목)
        </h2>
        <p className="mb-6">회사는 다음과 같은 개인정보를 수집합니다:</p>
        <ul className="list-disc pl-6 mb-6">
          <li>필수 정보: 이름, 이메일, 전화번호, 배송지 주소</li>
          <li>
            선택 정보: 생년월일, 성별, 건강 상태 관련 정보(이용자가 제공하는
            경우에 한함)
          </li>
          <li>자동 수집 정보: IP 주소, 쿠키, 접속기록, 기기정보</li>
        </ul>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          제3조 (개인정보의 수집 및 이용목적)
        </h2>
        <p className="mb-6">
          회사는 수집한 개인정보를 다음의 목적으로 사용합니다:
        </p>
        <ul className="list-disc pl-6 mb-6">
          <li>회원 가입 및 관리</li>
          <li>상품 및 서비스 제공을 위한 계약 이행</li>
          <li>고객 상담 및 민원 처리</li>
          <li>마케팅 및 서비스 개선</li>
        </ul>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          제4조 (개인정보의 보유 및 이용기간)
        </h2>
        <p className="mb-6">
          회사는 이용자의 개인정보를 법령에서 정한 기간 동안 보유하며,
          개인정보의 보유 및 이용기간은 다음과 같습니다:
        </p>
        <ul className="list-disc pl-6 mb-6">
          <li>회원 가입 정보: 회원 탈퇴 시까지</li>
          <li>
            거래 기록: 전자상거래 등에서의 소비자 보호에 관한 법률에 따라 5년
          </li>
          <li>전자금융 거래 기록: 전자금융거래법에 따라 5년</li>
          <li>불만 또는 분쟁 처리 기록: 3년</li>
        </ul>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          제5조 (개인정보의 제3자 제공)
        </h2>
        <p className="mb-6">
          회사는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 단,
          법령에 따라 요구되는 경우에는 예외로 합니다.
        </p>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          제6조 (개인정보의 안전성 확보 조치)
        </h2>
        <p className="mb-6">
          회사는 개인정보를 안전하게 관리하기 위해 다음과 같은 조치를 취하고
          있습니다:
        </p>
        <ul className="list-disc pl-6 mb-6">
          <li>개인정보 접근 제한</li>
          <li>암호화를 통한 개인정보 보호</li>
          <li>접근 기록의 보관 및 위변조 방지</li>
          <li>보안 프로그램 설치 및 주기적인 점검</li>
        </ul>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          제7조 (이용자의 권리)
        </h2>
        <p className="mb-6">
          이용자는 언제든지 다음과 같은 권리를 행사할 수 있습니다:
        </p>
        <ul className="list-disc pl-6 mb-6">
          <li>개인정보 열람 요청</li>
          <li>개인정보 정정 요청</li>
          <li>개인정보 삭제 요청</li>
          <li>개인정보 처리 정지 요청</li>
        </ul>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          제8조 (개인정보처리방침의 변경)
        </h2>
        <p className="mb-6">
          본 개인정보처리방침은 관련 법령 및 회사 정책에 따라 변경될 수 있으며,
          변경 시 서비스 화면에 공지합니다.
        </p>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          제9조 (개인정보 보호책임자)
        </h2>
        <p>
          회사는 이용자의 개인정보 보호와 관련한 문의 및 불만 처리를 위해 다음과
          같은 개인정보 보호책임자를 지정하고 있습니다:
        </p>
        <ul className="list-disc pl-6 mb-6">
          <li>책임자: 권혁찬</li>
          <li>이메일: smilerobert@naver.com</li>
          <li>전화번호: 010-7603-8164</li>
        </ul>
      </div>
    </div>
  );
}
