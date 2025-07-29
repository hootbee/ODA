package com.example.oda.dto;

import java.util.List;

public class QueryPlanDto {
    private String majorCategory;
    private List<String> keywords;
    private Integer searchYear;
    private String providerAgency;
    private boolean hasDateFilter;
    private int limit;

    public QueryPlanDto() {
    }

    public QueryPlanDto(String majorCategory, List<String> keywords, Integer searchYear, String providerAgency, boolean hasDateFilter, int limit) {
        this.majorCategory = majorCategory;
        this.keywords = keywords;
        this.searchYear = searchYear;
        this.providerAgency = providerAgency;
        this.hasDateFilter = hasDateFilter;
        this.limit = limit;
    }

    public String getMajorCategory() {
        return majorCategory;
    }

    public void setMajorCategory(String majorCategory) {
        this.majorCategory = majorCategory;
    }

    public List<String> getKeywords() {
        return keywords;
    }

    public void setKeywords(List<String> keywords) {
        this.keywords = keywords;
    }

    public Integer getSearchYear() {
        return searchYear;
    }

    public void setSearchYear(Integer searchYear) {
        this.searchYear = searchYear;
    }

    public String getProviderAgency() {
        return providerAgency;
    }

    public void setProviderAgency(String providerAgency) {
        this.providerAgency = providerAgency;
    }

    public boolean isHasDateFilter() {
        return hasDateFilter;
    }

    public void setHasDateFilter(boolean hasDateFilter) {
        this.hasDateFilter = hasDateFilter;
    }

    public int getLimit() {
        return limit;
    }

    public void setLimit(int limit) {
        this.limit = limit;
    }
}
