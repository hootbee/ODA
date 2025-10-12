package com.example.oda.repository;

import com.example.oda.entity.PublicData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface PublicDataRepository extends JpaRepository<PublicData, String> {

    @Query("SELECT p FROM PublicData p WHERE " +
            "(:majorCategory IS NULL OR UPPER(p.category) LIKE UPPER(CONCAT('%', :majorCategory, '%'))) AND " +
            "(:keyword IS NULL OR :keyword = '' OR " +
            " UPPER(p.tags) LIKE UPPER(CONCAT('%', :keyword, '%')) OR " +
            " UPPER(p.title) LIKE UPPER(CONCAT('%', :keyword, '%')) OR " +
            " UPPER(p.providerAgency) LIKE UPPER(CONCAT('%', :keyword, '%')) OR " +
            " UPPER(p.description) LIKE UPPER(CONCAT('%', :keyword, '%')))")
    List<PublicData> searchByQueryPlan(@Param("majorCategory") String majorCategory, @Param("keyword") String keyword);

    List<PublicData> findByProviderAgencyContainingIgnoreCase(String providerAgency);

    List<PublicData> findByTagsContainingIgnoreCase(String tags);
    List<PublicData> findByTitleContainingIgnoreCase(String title);
    List<PublicData> findByDescriptionContainingIgnoreCase(String description);

    // 기존 메서드 (유지)
    List<PublicData> findByTagsContainingIgnoreCaseOrTitleContainingIgnoreCaseOrDescriptionContainingIgnoreCaseOrCategoryContainingIgnoreCase(
            String tags, String title, String description, String category);

    // 개선된 메서드 추가
    @Query("SELECT p FROM PublicData p WHERE " +
            "UPPER(p.tags) LIKE UPPER(CONCAT('%', :searchTerm, '%')) OR " +
            "UPPER(p.title) LIKE UPPER(CONCAT('%', :searchTerm, '%')) OR " +
            "UPPER(p.description) LIKE UPPER(CONCAT('%', :searchTerm, '%')) OR " +
            "UPPER(p.category) LIKE UPPER(CONCAT('%', :searchTerm, '%'))")
    List<PublicData> searchByKeyword(@Param("searchTerm") String searchTerm);

    // 분류체계 전용 검색
    List<PublicData> findByCategoryContainingIgnoreCase(String category);
    @Query(value = "SELECT * FROM public.seouldata WHERE " +
            "EXISTS (SELECT 1 FROM unnest(string_to_array(tags, ',')) AS keyword " +
            "WHERE TRIM(keyword) ILIKE CONCAT('%', :searchKeyword, '%'))",
            nativeQuery = true)
    List<PublicData> findByKeywordExactMatch(@Param("searchKeyword") String searchKeyword);

    // 키워드 배열 분리 후 매칭
    @Query(value = "SELECT * FROM public.seouldata WHERE " +
            "tags ~ CONCAT('(^|,)\\s*', :searchKeyword, '\\s*(,|$)')",
            nativeQuery = true)
    List<PublicData> findByKeywordRegexMatch(@Param("searchKeyword") String searchKeyword);
    // ⭐ 제목으로 상세 데이터 조회
    Optional<PublicData> findByTitle(String title);

    // ⭐ 유사한 제목 검색 (정확하지 않은 경우 대비)
    @Query("SELECT p FROM PublicData p WHERE UPPER(p.title) LIKE UPPER(CONCAT('%', :title, '%'))")
    List<PublicData> findByTitleContaining(@Param("title") String title);
}