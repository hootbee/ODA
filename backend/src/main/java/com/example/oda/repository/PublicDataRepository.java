package com.example.oda.repository;

import com.example.oda.entity.PublicData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface PublicDataRepository extends JpaRepository<PublicData, String> {

    // 기존 메서드 (유지)
    List<PublicData> findByKeywordsContainingIgnoreCaseOrTitleContainingIgnoreCaseOrDescriptionContainingIgnoreCaseOrClassificationSystemContainingIgnoreCase(
            String keywords, String title, String description, String classificationSystem);

    // 개선된 메서드 추가
    @Query("SELECT p FROM PublicData p WHERE " +
            "UPPER(p.keywords) LIKE UPPER(CONCAT('%', :searchTerm, '%')) OR " +
            "UPPER(p.title) LIKE UPPER(CONCAT('%', :searchTerm, '%')) OR " +
            "UPPER(p.description) LIKE UPPER(CONCAT('%', :searchTerm, '%')) OR " +
            "UPPER(p.classificationSystem) LIKE UPPER(CONCAT('%', :searchTerm, '%'))")
    List<PublicData> searchByKeyword(@Param("searchTerm") String searchTerm);

    // 분류체계 전용 검색
    List<PublicData> findByClassificationSystemContainingIgnoreCase(String classificationSystem);
}
