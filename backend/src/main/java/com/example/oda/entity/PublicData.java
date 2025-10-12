package com.example.oda.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * 서울 열린데이터광장 메타데이터 엔티티
 * - publicDataPk를 기본키로 사용
 */
@Entity
@Table(
        name = "seouldata",
        schema = "public",
        indexes = {
                @Index(name = "idx_seouldata_title", columnList = "title"),
                @Index(name = "idx_seouldata_category", columnList = "category")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PublicData {

    /** data.go.kr 또는 서울열린데이터광장 내부 식별자 (PK) */
    @Id
    @Column(name = "public_data_pk", length = 50, nullable = false, unique = true)
    private String publicDataPk;

    /** 제목 (데이터셋 명칭) */
    @Column(name = "title", nullable = false)
    private String title;

    /** 분류체계 (보건, 환경, 교통 등) */
    @Column(name = "category")
    private String category;

    /** 제공기관 (예: 서울특별시) */
    @Column(name = "provider_agency")
    private String providerAgency;

    /** 제공부서 (예: 시민건강국 감염병관리과) */
    @Column(name = "provider_department")
    private String providerDepartment;

    /** 원본시스템 (예: 시도행정정보시스템) */
    @Column(name = "source_system")
    private String sourceSystem;

    /** 라이선스 유형 (예: 공공누리 1유형) */
    @Column(name = "license_type")
    private String licenseType;

    /** 활용 조건 (예: 출처표시, 상업적 이용 가능 등) */
    @Column(name = "usage_terms", columnDefinition = "TEXT")
    private String usageTerms;

    /** 관련 태그 */
    @Column(name = "tags")
    private String tags;

    /** 데이터 설명 */
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /** 데이터 갱신일 */
    @Column(name = "data_updated_at")
    private LocalDateTime dataUpdatedAt;

    /** 담당자 연락처 */
    @Column(name = "contact_number")
    private String contactNumber;

    /** 등록일 */
    @Builder.Default
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    /** 수정일 */
    @Builder.Default
    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();
}