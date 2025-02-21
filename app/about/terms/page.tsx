"use client";

import Link from "next/link";

export default function Terms() {
  return (
    <div className="w-full max-w-[640px] mt-8 mb-12 px-8 py-10 bg-white sm:shadow-md sm:rounded-lg">
      <h1 className="text-xl font-bold text-gray-800 mb-10 text-center">
        이용약관
      </h1>
      <div className="text-gray-700 leading-relaxed">
        {/* 제1조 (목적) */}
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          제1조 (목적)
        </h2>
        <p className="mb-6">
          본 약관은 웰니스박스(이하 &quot;회사&quot;)가 제공하는 건강기능식품
          온라인 중개 플랫폼 서비스(이하 &quot;서비스&quot;)의 이용 조건 및
          절차, 이용자와 회사 간의 권리, 의무 및 책임사항을 규정함을 목적으로
          합니다.
        </p>

        {/* 제2조 (정의) */}
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          제2조 (정의)
        </h2>
        <p className="mb-6">
          이 약관에서 사용하는 용어의 정의는 다음과 같습니다:
        </p>
        <ul className="list-disc pl-6 mb-6">
          <li>
            &quot;서비스&quot;란 회사가 온라인을 통해 약국과 소비자를 중개하여,
            건강기능식품을 주문 및 배송받을 수 있도록 지원하는 플랫폼을
            말합니다.
          </li>
          <li>
            &quot;이용자&quot;란 본 약관에 따라 서비스를 이용하는 개인 또는
            법인을 말합니다.
          </li>
          <li>
            &quot;통신판매중개자&quot;란 상품을 직접 판매하지 않고 약국과 이용자
            간 거래를 중개하는 회사를 말하며, 회사는 통신판매중개자 역할을
            수행합니다.
          </li>
          <li>
            &quot;약국&quot;이란 건강기능식품을 판매하는 사업자로서, 회사의
            서비스를 통해 소비자와 거래를 진행하는 자를 말합니다.
          </li>
          <li>
            &quot;계정&quot;이란 이용자가 서비스를 이용하기 위해 설정한 고유한
            아이디와 비밀번호를 말합니다.
          </li>
        </ul>

        {/* 제3조 (약관의 게시 및 변경) */}
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          제3조 (약관의 게시 및 변경)
        </h2>
        <p className="mb-6">
          1. 본 약관은 회사가 운영하는 서비스의 초기 화면(또는 연결화면)에
          게시하여 이용자가 확인할 수 있도록 합니다.
          <br />
          2. 회사는 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수
          있으며, 변경된 약관은 공지 후 적용합니다.
          <br />
          3. 이용자가 변경된 약관에 동의하지 않을 경우, 서비스 이용을 중단하고
          회원 탈퇴를 요청할 수 있습니다.
        </p>

        {/* 제4조 (서비스의 제공 및 변경) */}
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          제4조 (서비스의 제공 및 변경)
        </h2>
        <p className="mb-6">1. 회사는 다음과 같은 서비스를 제공합니다:</p>
        <ul className="list-disc pl-6 mb-6">
          <li>건강기능식품 온라인 중개 서비스</li>
          <li>약국과 이용자 간의 주문 연계 및 배송 중개</li>
          <li>기타 회사가 정하는 부가 서비스</li>
        </ul>
        <p className="mb-6">
          2. 회사는 서비스 운영상, 기술상 필요에 따라 제공하는 서비스의 내용을
          변경할 수 있으며, 중요한 사항은 사전에 공지합니다.
        </p>

        {/* 제5조 (통신판매중개자의 의무) */}
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          제5조 (통신판매중개자의 의무)
        </h2>
        <p className="mb-6">
          1. 회사는 「전자상거래 등에서의 소비자보호에 관한 법률」에 따라
          통신판매중개자로서 서비스를 운영하고 있습니다.
          <br />
          2. 회사는 통신판매의 당사자가 아니며, 거래의 당사자는 약국과
          이용자임을 명시적으로 안내하고 있습니다.
          <br />
          3. 회사는 약국이 사업자인 경우, 약국의 상호, 주소, 전화번호,
          사업자등록번호 등을 이용자가 청약을 결정하기 전에 확인할 수 있도록
          서비스 화면에 표시합니다.
          <br />
          4. 회사는 &quot;전자상거래 등에서의 소비자보호에 관한 법률&quot;
          제20조, 제13조, 시행령 제25조 등 관련 규정을 준수하고 있습니다.
        </p>

        {/* 제6조 (이용자의 의무) */}
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          제6조 (이용자의 의무)
        </h2>
        <p className="mb-6">1. 이용자는 다음 행위를 하여서는 안 됩니다:</p>
        <ul className="list-disc pl-6 mb-6">
          <li>타인의 계정을 도용하거나 부정 사용하는 행위</li>
          <li>서비스의 운영을 방해하거나 안정성을 저해하는 행위</li>
          <li>허위 정보를 제공하거나 부정한 목적으로 서비스를 이용하는 행위</li>
          <li>관련 법령 및 본 약관에 위배되는 행위</li>
        </ul>
        <p className="mb-6">
          2. 이용자는 건강기능식품 주문 전, 제품의 성분이나 알러지 유발 가능성
          등 정보를 충분히 확인해야 합니다. 제품 섭취에 대한 책임은 전적으로
          이용자에게 있습니다.
        </p>

        {/* 제7조 (주문 및 결제) */}
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          제7조 (주문 및 결제)
        </h2>
        <p className="mb-6">
          1. 이용자는 회사가 안내하는 절차에 따라 상품을 주문하고, 회사가 지정한
          방식으로 대금을 결제합니다.
          <br />
          2. 이용자가 결제한 금액 중 일정 수수료는 회사가 수취하며, 나머지
          금액은 약국에 정산됩니다.
          <br />
          3. 회사는 전자지급결제대행(PG) 서비스를 이용하고 있으며, 결제와 관련된
          분쟁은 PG사의 정책에 따릅니다.
        </p>

        {/* 제8조 (청약철회 및 환불) */}
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          제8조 (청약철회 및 환불)
        </h2>
        <p className="mb-6">
          1. 건강기능식품 특성상, 제품이 발송된 이후에는 원칙적으로 환불이
          불가능합니다. 다만, 제품의 하자 또는 오배송 등 약국의 귀책사유가 있는
          경우에는 교환 또는 환불이 가능합니다.
          <br />
          2. 제품의 하자 또는 오배송으로 인한 환불 요청은 제품 수령 후 7일
          이내에{" "}
          <Link href="/about/contact" className="text-blue-600 hover:underline">
            문의 연락처
          </Link>
          를 통해 접수해야 합니다.
          <br />
          3. 단순 변심에 의한 환불은 식품위생법 등 관련 법령에 따라 제한됩니다.
          <br />
          4. 환불 및 교환이 불가능한 경우:
        </p>
        <ul className="list-disc pl-6 mb-6">
          <li>개봉 또는 사용으로 인해 상품 가치가 훼손된 제품</li>
          <li>배송 완료 후 7일이 경과한 제품</li>
          <li>소비자의 부주의로 인한 제품 파손 또는 훼손</li>
        </ul>
        <p className="mb-6">
          5. 환불이 승인된 경우, 환불은 접수일로부터 영업일 기준 5일 이내에
          처리됩니다.
        </p>

        {/* 제9조 (배송) */}
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          제9조 (배송)
        </h2>
        <p className="mb-6">
          1. 회사는 약국과 이용자 간의 배송 절차를 중개하며, 직접 배송 업무를
          수행하지 않습니다.
          <br />
          2. 배송비는 이용자가 부담하며, 주문 시 별도로 안내 및 청구됩니다.
          <br />
          3. 일반적으로 배송은 영업일 기준 5일 이내에 완료됩니다. 단, 천재지변,
          물류사정 등 불가항력적인 사유가 발생할 경우 배송이 지연될 수 있으며,
          이에 대한 사전 안내를 제공합니다.
          <br />
          4. 배송 지연, 분실, 파손 등 배송 과정에서 발생하는 문제는 배송업체
          혹은 약국에 문의할 수 있으며, 회사는 중개자로서 분쟁 해결을 위해
          합리적인 노력을 기울입니다.
        </p>

        {/* 제10조 (책임의 제한) */}
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          제10조 (책임의 제한)
        </h2>
        <p className="mb-6">
          1. 회사는 통신판매중개자로서 거래의 당사자가 아니며, 상품의 품질,
          안전성 등에 대해 보증하지 않습니다. 이와 관련된 책임은 판매자인 약국에
          있습니다.
          <br />
          2. 회사는 이용자의 귀책사유로 인해 발생하는 문제에 대해 책임을 지지
          않습니다.
          <br />
          3. 건강기능식품 섭취로 인한 알러지, 부작용 등 문제에 대해서는 이용자가
          전문가와의 상담을 거쳐 신중히 구매해야 하며, 회사는 이에 대한 책임을
          부담하지 않습니다.
        </p>

        {/* 제11조 (개인정보 보호) */}
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          제11조 (개인정보 보호)
        </h2>
        <p className="mb-6">
          1. 회사는 「개인정보 보호법」 등 관련 법령을 준수하며, 이용자의
          개인정보를 보호하기 위해 최선을 다하고 있습니다.
          <br />
          2. 회사는 이용자의 개인정보를 서비스 운영 및 주문 처리를 위한
          목적으로만 사용합니다.
          <br />
          3. 회사는 이용자의 사전 동의 없이 개인정보를 제3자에게 제공하지
          않습니다. 다만, 관계 법령에 따라 요청받은 경우는 예외로 합니다.
        </p>

        {/* 제12조 (서비스 이용 제한) */}
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          제12조 (서비스 이용 제한)
        </h2>
        <p className="mb-6">
          1. 이용자가 본 약관 또는 관련 법령을 위반하거나, 서비스 운영을
          심각하게 저해하는 행위를 하는 경우 회사는 사전 통보 후 이용 제한
          조치를 취할 수 있습니다.
          <br />
          2. 이용 제한에 대해 이의가 있는 경우, 이용자는 회사에 소명을 제출할 수
          있으며 회사는 이를 검토 후 이용 재개 여부를 결정합니다.
        </p>

        {/* 제13조 (분쟁 해결) */}
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          제13조 (분쟁 해결)
        </h2>
        <p className="mb-6">
          1. 회사는 이용자로부터 제기되는 불만 및 의견을 신속하게 처리하기 위해
          노력합니다.
          <br />
          2. 회사와 이용자 간에 분쟁이 발생한 경우, 당사자 간 합의가 이루어지지
          않을 때에는 관할 법원에 소를 제기할 수 있습니다. 관할 법원은
          민사소송법이 정한 절차에 따릅니다.
        </p>

        {/* 제14조 (기타) */}
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          제14조 (기타)
        </h2>
        <p className="mb-6">
          본 약관에서 정하지 않은 사항은 관계 법령 및 상관례에 따릅니다.
          <br />
          전자상거래 등에서의 소비자보호에 관한 법률, 약사법, 건강기능식품에
          관한 법률 기타 관련 법령에 관한 준수 사항은 회사와 약국 모두 이미
          충실히 이행하고 있습니다.
        </p>
      </div>
    </div>
  );
}
