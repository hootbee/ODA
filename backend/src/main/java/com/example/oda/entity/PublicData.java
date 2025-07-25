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
@Table(name = "public_data")
@Setter
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class PublicData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "file_data_name", nullable = false)
    private String fileDataName;

    @Column(name = "classification_system")
    private String classificationSystem;

    @Column(name = "provider_agency")
    private String providerAgency;

    @Column(name = "file_extension")
    private String fileExtension;

    @Column(name = "keywords")
    private String keywords;

    @Column(name = "modified_date")
    private LocalDateTime modifiedDate;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "title", nullable = false)
    private String title;

    // 추가된 부분
    @Column(name = "created_at", updatable = false)
    @CreationTimestamp
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
