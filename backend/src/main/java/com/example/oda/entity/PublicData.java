package com.example.oda.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "FILE_data", schema = "public")
@Setter
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class PublicData {

    @Id
    @Column(name = "제목", nullable = false)
    private String title;

    @Column(name = "파일데이터명", nullable = false)
    private String fileDataName;

    @Column(name = "분류체계")
    private String classificationSystem;

    @Column(name = "제공기관")
    private String providerAgency;

    @Column(name = "확장자")
    private String fileExtension;

    @Column(name = "키워드")
    private String keywords;

    @Column(name = "수정일")
    private LocalDateTime modifiedDate; // String으로 변경 (테이블에서 text 타입)

    @Column(name = "설명")
    private String description;

//    // 생성/수정 시간 추적용 (테이블에는 없지만 애플리케이션에서 사용)
//    @Column(name = "created_at", updatable = false)
//    @CreationTimestamp
//    private LocalDateTime createdAt;
//
//    @Column(name = "updated_at")
//    @UpdateTimestamp
//    private LocalDateTime updatedAt;
}
