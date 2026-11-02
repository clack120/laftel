# @clack120/laftel

비공식 라프텔 TypeScript SDK입니다. Bun, Deno, Node.js, tjs를 모두 지원합니다.

## Disclaimer

이 SDK 사용에 따른 계정 이용 제한 위험을 감수해야 합니다. 라프텔은 다음과 같이 안내하고 있습니다.

> 라프텔은 비정상적인 접근에 대해 서비스의 안정적인 운영을 저해하는 중대한 위반 행위로 간주하고 있습니다.
> 이에 이용약관 제10조 제5항(이용자의 의무)에 따라 사전 안내 없이 계정 이용을 즉시 제한할 예정입니다.

**사용 책임은 사용자에게 있으며, 계정 정지, 구매 콘텐츠 접근 상실, 데이터 손실 등 사용으로 인한 손해에 책임을 지지 않습니다.**

## Usage

Node.js는 `npm i @clack120/laftel`, Bun은 `bun add @clack120/laftel`로 설치합니다.

tjs에서는 `tjs bundle`로 묶어서 실행합니다.

```ts
import { Laftel } from "@clack120/laftel";

const client = new Laftel({ anon: false });
const page = await client.search.keyword("마법소녀", { limit: 3 });
for (const item of page.results) console.log(item.id, item.name);

const first = page.results[0];
if (first) {
  const item = await client.items.get(first.id);
  const episodes = await client.episodes.list(item.id, { limit: 5 });
  console.log(item.name, episodes.results.map((ep) => ep.title));
}

const events = await client.premieres.list();
for (const event of events) console.log(event.id, event.status, event.startsAt);
```

계정이 필요한 호출에만 토큰을 설정합니다. Node.js/Bun 기준:

```ts
client.token = process.env.LAFTEL_TOKEN ?? null; // or client.login("email", "password");
if (!client.token) throw new Error("LAFTEL_TOKEN required");

const membership = await client.memberships.current();

console.log({
  active: membership !== null,
  expiresAt: membership?.expiresAt
});
```

그 밖에 `items.series()`, `items.related()`, `reviews.list()`, `comments.list()`, `shorts.feed()`, `store.products.list()` 등으로 조회합니다.
한국 IP에서만 제대로 동작합니다.

API 버전은 상위 호환을 보장하지 않습니다. 메서드의 반환 타입과 JSDoc을 기준으로 선택하세요.  
모델의 `raw`에는 수신한 원문 필드가 보존됩니다.  

라이선스: [Unlicense](LICENSE). 아무런 보증 없이 제공됩니다.
