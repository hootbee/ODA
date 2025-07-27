package com.example.oda.repository;

import com.example.oda.entity.PublicData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface PublicDataRepository extends JpaRepository<PublicData, String> {

    @Query("SELECT p FROM PublicData p WHERE " +
            "(:majorCategory IS NULL OR UPPER(p.classificationSystem) LIKE UPPER(CONCAT('%', :majorCategory, '%'))) AND " +
            "(:keyword IS NULL OR :keyword = '' OR " +
            " UPPER(p.keywords) LIKE UPPER(CONCAT('%', :keyword, '%')) OR " +
            " UPPER(p.title) LIKE UPPER(CONCAT('%', :keyword, '%')) OR " +
            " UPPER(p.providerAgency) LIKE UPPER(CONCAT('%', :keyword, '%')) OR " +
            " UPPER(p.fileDataName) LIKE UPPER(CONCAT('%', :keyword, '%')) OR " +
            " UPPER(p.description) LIKE UPPER(CONCAT('%', :keyword, '%')))")
    List<PublicData> searchByQueryPlan(@Param("majorCategory") String majorCategory, @Param("keyword") String keyword);

    List<PublicData> findByProviderAgencyContainingIgnoreCase(String providerAgency);

    List<PublicData> findByKeywordsContainingIgnoreCase(String keywords);
    List<PublicData> findByTitleContainingIgnoreCase(String title);
    List<PublicData> findByFileDataNameContainingIgnoreCase(String fileDataName);
    List<PublicData> findByDescriptionContainingIgnoreCase(String description);

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
    @Query(value = "SELECT * FROM public.file_data WHERE " +
            "EXISTS (SELECT 1 FROM unnest(string_to_array(키워드, ',')) AS keyword " +
            "WHERE TRIM(keyword) ILIKE CONCAT('%', :searchKeyword, '%'))",
            nativeQuery = true)
    List<PublicData> findByKeywordExactMatch(@Param("searchKeyword") String searchKeyword);

    // 키워드 배열 분리 후 매칭
    @Query(value = "SELECT * FROM public.file_data WHERE " +
            "키워드 ~ CONCAT('(^|,)\\s*', :searchKeyword, '\\s*(,|$)')",
            nativeQuery = true)
    List<PublicData> findByKeywordRegexMatch(@Param("searchKeyword") String searchKeyword);
    // ⭐ 파일명으로 상세 데이터 조회
    Optional<PublicData> findByFileDataName(String fileDataName);

    // ⭐ 유사한 파일명 검색 (정확하지 않은 경우 대비)
    @Query("SELECT p FROM PublicData p WHERE UPPER(p.fileDataName) LIKE UPPER(CONCAT('%', :fileName, '%'))")
    List<PublicData> findByFileDataNameContaining(@Param("fileName") String fileName);
}