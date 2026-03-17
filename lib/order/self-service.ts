export type OrderSelfServiceCardModel = {
  tone: "sky" | "amber" | "emerald";
  badge: string;
  title: string;
  body: string;
  bullets: string[];
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
};

type BuildOrderLookupSelfServiceInput = {
  isViewingDetails: boolean;
  isPhoneLinked: boolean;
  phoneStatusLoading: boolean;
  phoneStatusError: string | null;
  linkedPhoneDisplay: string;
  manualError: string;
  manualPhoneDisplay: string;
  password: string;
};

type BuildOrderNotificationSelfServiceInput = {
  isSubscribed: boolean;
  notificationPermission: NotificationPermission | "unsupported";
  browserSupported: boolean;
  isLoading: boolean;
};

export function buildOrderLookupSelfService(
  input: BuildOrderLookupSelfServiceInput
): OrderSelfServiceCardModel {
  if (input.phoneStatusLoading) {
    return {
      tone: "sky",
      badge: "주문조회 안내",
      title: "연결된 번호를 먼저 확인하고 있어요",
      body:
        "주문조회에서 가장 빠른 방법은 연결된 전화번호로 바로 찾는 거예요. 잠시만 기다리면 어떤 조회가 맞는지 더 정확히 안내할 수 있어요.",
      bullets: [
        "연결 번호가 있으면 비밀번호 없이 바로 주문을 볼 수 있어요.",
        "연결 번호가 없더라도 결제 때 입력한 번호와 주문 조회 비밀번호로 수동 조회할 수 있어요.",
      ],
    };
  }

  if (input.phoneStatusError) {
    return {
      tone: "amber",
      badge: "조회 진단",
      title: "연결 번호 확인이 안 될 때는 수동 조회가 가장 빨라요",
      body:
        "현재는 연결된 전화번호 상태를 불러오지 못했으니, 기다리기보다 결제 때 입력한 전화번호와 주문 조회 비밀번호로 직접 찾는 편이 더 빨라요.",
      bullets: [
        "전화번호는 카카오 계정 번호가 아니라 결제 시 주문에 입력한 번호 기준이에요.",
        "비밀번호는 결제 직전에 직접 정한 주문 조회 비밀번호예요.",
        "연결 번호 조회가 필요하면 전화번호 인증을 다시 열어 연동 상태를 갱신할 수 있어요.",
      ],
      primaryActionLabel: "수동 조회로 찾기",
      secondaryActionLabel: "전화번호 다시 인증하기",
    };
  }

  if (input.manualError.trim()) {
    return {
      tone: "amber",
      badge: "조회 진단",
      title: "주문이 안 보일 때는 번호와 비밀번호 기준을 먼저 맞춰보세요",
      body:
        "주문 조회 실패는 대부분 주문 당시 입력한 번호와 주문 조회 비밀번호가 현재 입력값과 다를 때 생겨요.",
      bullets: [
        "카카오 로그인 번호와 주문 입력 번호가 다를 수 있어요.",
        "비밀번호는 일반 계정 비밀번호가 아니라 결제 시 따로 정한 주문 조회 비밀번호예요.",
        input.isPhoneLinked
          ? `현재 연결된 번호 ${input.linkedPhoneDisplay}로 조회되면 비밀번호 없이 바로 확인할 수 있어요.`
          : "연결 번호가 없다면 전화번호 인증을 먼저 하면 이후 조회가 훨씬 쉬워져요.",
      ],
      primaryActionLabel: input.isPhoneLinked
        ? "연결 번호로 다시 조회"
        : "전화번호 인증하기",
      secondaryActionLabel: "다른 번호로 다시 입력하기",
    };
  }

  if (!input.isPhoneLinked && input.password.trim().length < 4) {
    return {
      tone: "sky",
      badge: "주문조회 안내",
      title: "지금은 두 가지 길 중 편한 쪽을 고르면 돼요",
      body:
        "전화번호 인증을 먼저 하면 비밀번호 없이 바로 볼 수 있고, 인증이 어렵다면 결제 때 입력한 번호와 주문 조회 비밀번호로 찾을 수 있어요.",
      bullets: [
        "연결 번호 조회는 가장 빠른 방법이에요.",
        "수동 조회는 결제 때 입력한 전화번호와 4자리 이상 주문 조회 비밀번호가 필요해요.",
        "둘 중 어느 방법이든 같은 주문을 가리키므로 편한 쪽부터 시도해도 괜찮아요.",
      ],
      primaryActionLabel: "전화번호 인증하기",
      secondaryActionLabel: "수동 조회로 찾기",
    };
  }

  if (input.isViewingDetails && input.isPhoneLinked) {
    return {
      tone: "emerald",
      badge: "셀프 해결",
      title: "지금 화면에서 대부분의 주문 문의는 직접 해결할 수 있어요",
      body:
        "상태 확인, 메시지 확인, 알림 설정, 다른 번호 전환까지 현재 화면에서 바로 이어질 수 있게 준비돼 있어요.",
      bullets: [
        "상태가 멈춘 것처럼 보여도 단계 사이 준비 시간이 있을 수 있어요.",
        "주소나 전달 요청이 바뀌면 메시지에서 바로 남기면 돼요.",
        "다른 번호 주문을 봐야 하면 상단에서 번호를 바꿔 다시 조회할 수 있어요.",
      ],
      secondaryActionLabel: "다른 번호로 조회하기",
    };
  }

  if (input.isPhoneLinked) {
    return {
      tone: "emerald",
      badge: "빠른 조회",
      title: "연결된 번호로 가장 빠르게 주문을 찾을 수 있어요",
      body:
        "이미 전화번호가 연결돼 있다면 비밀번호 없이 바로 주문 내역을 확인하는 편이 가장 빠르고 실수가 적어요.",
      bullets: [
        `현재 연결된 번호는 ${input.linkedPhoneDisplay}예요.`,
        "이 번호로 찾히지 않는 주문만 다른 번호 수동 조회로 내려가면 돼요.",
        "번호가 바뀌었으면 인증 버튼으로 상태를 다시 맞출 수 있어요.",
      ],
      primaryActionLabel: "연결 번호로 조회하기",
      secondaryActionLabel: "다른 번호로 조회하기",
    };
  }

  return {
    tone: "sky",
    badge: "주문조회 안내",
    title: "주문조회는 연결 번호 또는 수동 조회 둘 중 하나면 충분해요",
    body:
      "가장 많이 막히는 이유는 조회 방법보다 기준 정보가 섞이는 경우예요. 먼저 어떤 기준으로 찾을지 분명히 하면 문의 없이 해결될 가능성이 높아요.",
    bullets: [
      "전화번호 인증을 하면 비밀번호 없이 바로 조회할 수 있어요.",
      "수동 조회는 결제 때 입력한 전화번호와 주문 조회 비밀번호 기준이에요.",
      "카카오 로그인 정보와 주문 입력 정보가 다를 수 있으니 헷갈리면 연결 번호부터 확인해 보세요.",
    ],
    primaryActionLabel: "전화번호 인증하기",
    secondaryActionLabel: "수동 조회로 찾기",
  };
}

export function buildOrderNotificationSelfService(
  input: BuildOrderNotificationSelfServiceInput
): OrderSelfServiceCardModel {
  if (!input.browserSupported) {
    return {
      tone: "amber",
      badge: "알림 진단",
      title: "이 브라우저에서는 주문 알림이 제한될 수 있어요",
      body:
        "일부 브라우저나 환경에서는 푸시 알림이 안정적으로 동작하지 않을 수 있어요. 대신 현재 주문 화면에서 상태와 메시지를 직접 확인하는 쪽이 더 정확해요.",
      bullets: [
        "알림이 안 와도 주문 상태와 약국 메시지는 이 화면에서 계속 확인할 수 있어요.",
        "새 메시지가 보이면 바로 답장하거나 요청사항을 남길 수 있어요.",
      ],
    };
  }

  if (input.notificationPermission === "denied") {
    return {
      tone: "amber",
      badge: "알림 진단",
      title: "브라우저에서 알림 권한이 꺼져 있어요",
      body:
        "현재는 주문 알림 버튼을 눌러도 브라우저 권한이 막혀 있어 알림이 연결되지 않아요. 설정에서 이 사이트 알림을 허용한 뒤 다시 시도하면 돼요.",
      bullets: [
        "사이트 권한에서 알림을 허용한 뒤 이 화면으로 돌아오면 다시 연결할 수 있어요.",
        "그 전까지는 주문 상태와 약국 메시지를 이 화면에서 직접 확인하는 편이 가장 정확해요.",
      ],
    };
  }

  if (input.isLoading) {
    return {
      tone: "sky",
      badge: "알림 확인",
      title: "현재 알림 연결 상태를 확인하고 있어요",
      body:
        "이 주문에 알림이 붙어 있는지 확인 중이에요. 잠시 후 상태에 맞는 다음 행동이 보일 거예요.",
      bullets: [
        "알림은 이 브라우저와 기기 기준으로 연결돼요.",
        "다른 기기에서 본 주문이면 다시 한 번 알림을 켜야 할 수 있어요.",
      ],
    };
  }

  if (input.isSubscribed) {
    return {
      tone: "emerald",
      badge: "알림 연결됨",
      title: "주문 알림이 켜져 있어요",
      body:
        "배송 진행이나 약국 메시지가 생기면 이 기기에서 바로 확인할 수 있는 상태예요. 알림이 늦게 느껴질 때는 주문 화면의 메시지 탭을 먼저 보는 편이 가장 정확해요.",
      bullets: [
        "알림은 이 브라우저와 현재 기기 기준으로 연결돼요.",
        "다른 기기에서는 다시 한 번 알림을 켜야 할 수 있어요.",
      ],
    };
  }

  return {
    tone: "sky",
    badge: "알림 셀프 해결",
    title: "알림을 켜 두면 반복 조회를 줄일 수 있어요",
    body:
      "문의가 늘어나는 순간 중 하나가 '상태가 바뀌었는지 계속 새로고침하는 상황'이에요. 이 주문에만 알림을 붙여 두면 배송과 메시지를 더 수월하게 따라갈 수 있어요.",
    bullets: [
      "주문 알림은 배송 진행과 약국 메시지 확인에 특히 유용해요.",
      "이 브라우저에서만 연결되므로 새 기기라면 다시 켜 주세요.",
      "알림을 켜도 가장 정확한 원문은 주문 메시지 화면에서 바로 확인할 수 있어요.",
    ],
    primaryActionLabel: "이 주문 알림 켜기",
  };
}
