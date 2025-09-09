package com.example.oda.prompt;

import com.example.oda.entity.PublicData;

import java.util.List;

public interface SearchService {
    List<PublicData> searchAndFilterData(List<String> keywords, String majorCategory);
    List<PublicData> deduplicateResults(List<PublicData> allResults);
    List<PublicData> sortResultsByRelevance(List<PublicData> uniqueResults, List<String> keywords, String prompt);
    String extractRegionFromKeywords(List<String> keywords);
}
