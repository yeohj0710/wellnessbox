export default function Contact() {
  return (
    <div className="mt-8 mb-12 w-full max-w-[640px] px-8 py-10 bg-white sm:shadow-md sm:rounded-lg">
      <h1 className="text-xl font-bold text-gray-800 mb-10 text-center">
        문의하기
      </h1>
      <p className="mb-8">
        전화 부재 시에는 메일 또는 문자를 남겨주시면 정성껏 답변드리겠습니다.
      </p>
      <h2 className="text-lg font-semibold text-gray-800 mb-2">이메일</h2>
      <p className="text-gray-700 leading-relaxed mb-8">
        <a
          href="mailto:wellnessbox.me@gmail.com"
          className="text-sky-500 hover:underline"
        >
          wellnessbox.me@gmail.com
        </a>
      </p>
      <h2 className="text-lg font-semibold text-gray-800 mb-2">
        대표 전화번호
      </h2>
      <p className="text-gray-700 leading-relaxed">02-6241-5530</p>
    </div>
  );
}
