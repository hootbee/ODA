package com.example.oda.repository;

import com.example.oda.entity.PublicData;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PublicDataRepository extends JpaRepository<PublicData, Long> {
    List<PublicData> findByKeywordsContainingIgnoreCaseOrTitleContainingIgnoreCaseOrDescriptionContainingIgnoreCaseOrClassificationSystemContainingIgnoreCase(String keywords, String title, String description, String classificationSystem);
}
