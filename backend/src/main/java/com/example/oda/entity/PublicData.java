package com.example.oda.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "file_data", schema = "public")
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
    private LocalDateTime modifiedDate;

    @Column(name = "설명", columnDefinition = "TEXT")
    private String description;

    // 누락된 컬럼 추가
//    @Column(name = "수정일_backup", columnDefinition = "TEXT")
//    private String modifiedDateBackup;
}
