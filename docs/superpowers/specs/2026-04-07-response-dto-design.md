# Response DTO Design

## Problem

Backend controllers return raw Prisma query results. This causes:
1. No explicit control over which fields are included in API responses
2. Inconsistent patterns (auth signup uses `select`, login manually picks fields)
3. `channel.findOne` leaks nested relations (`productAnalysis.product`) that the frontend doesn't use
4. Frontend types (`lib/types.ts`) are manually maintained with no contract enforcement

## Decision

Introduce Response DTO classes with static `from()` factory methods (pattern B: pure class + manual mapping).

## Conventions

- **File naming**: request DTOs use `.dto.ts`, response DTOs use `.response.ts`
- **Location**: inside each module's `dto/` folder, one response file per module
- **Transformation**: controllers call `ResponseDto.from(entity)` before returning
- **Services**: remain unchanged — return Prisma results, unaware of HTTP layer

## File Structure

```
auth/dto/
├── login.dto.ts              (existing)
├── signup.dto.ts             (existing)
└── auth.response.ts          (new — UserResponse)

product/dto/
├── create-product.dto.ts     (existing)
└── product.response.ts       (new — ProductResponse, ProductAnalysisResponse, ProductWithAnalysisResponse)

channel/dto/                  (new folder)
└── channel.response.ts       (new — ChannelRecommendationResponse)
```

## Response Classes

### `UserResponse`

Returned by: `POST /auth/signup`, `POST /auth/login`, `GET /auth/me`

```ts
class UserResponse {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: Date;
}
```

### `ProductResponse`

Returned by: `GET /products` (as array)

```ts
class ProductResponse {
  id: string;
  userId: string;
  name: string;
  url: string;
  additionalInfo: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### `ProductAnalysisResponse`

Nested inside `ProductWithAnalysisResponse`.

```ts
class ProductAnalysisResponse {
  id: string;
  productId: string;
  targetAudience: TargetAudience;  // JSON field — pass through as-is
  problem: string;
  alternatives: Alternative[];     // JSON field — pass through as-is
  comparisonTable: ComparisonItem[]; // JSON field — pass through as-is
  differentiators: string[];
  positioningStatement: string;
  keywords: string[];
  createdAt: Date;
}
```

### `ProductWithAnalysisResponse`

Returned by: `POST /products`, `GET /products/:id`

```ts
class ProductWithAnalysisResponse extends ProductResponse {
  analysis: ProductAnalysisResponse | null;
}
```

### `ChannelRecommendationResponse`

Returned by: `POST /.../channels/analyze` (as array), `GET /.../channels` (as array), `GET /.../channels/:id`

```ts
class ChannelRecommendationResponse {
  id: string;
  productAnalysisId: string;
  channelName: string;
  scoreBreakdown: ScoreBreakdown;  // JSON field — pass through as-is
  reason: string;
  effectiveContent: string;
  risk: string;
  effortLevel: string;
  expectedTimeline: string;
  createdAt: Date;
}
```

## Controller Changes

Each controller method wraps the service result with `ResponseDto.from()`:

```ts
// Single entity
return UserResponse.from(user);

// Array
return products.map(ProductResponse.from);
```

## Side Effects

- **auth.service.ts `login`**: remove manual field picking, use `select` like `signup` — both return the same shape, Response DTO controls what goes out
- **channel.service.ts `findOne`**: keep the `include` (needed for ownership check), but `ChannelRecommendationResponse.from()` only maps top-level fields — nested relations are excluded from the response
- **Frontend `lib/types.ts`**: no changes — Response DTO shapes match existing frontend types

## Out of Scope

- Shared type generation (e.g., Swagger + codegen)
- Response envelope (`{ data, meta }`)
- `class-transformer` / `ClassSerializerInterceptor`
