package com.example.demo;

import org.springframework.web.bind.annotation.*;
import java.util.*;

/**
 * [역할: REST API 게이트웨이]
 * - 요청 진입점으로서 유효성 검증 및 예외 처리 담당
 */
@RestController
@RequestMapping("/api/recommendations")
@CrossOrigin(origins = "*") 
public class RecommendationController {

    private final RecommendationService recommendationService;

    public RecommendationController(RecommendationService recommendationService) {
        this.recommendationService = recommendationService;
    }

    @PostMapping("/upload")
    public Map<String, Object> uploadFile(@ModelAttribute UploadRequestDto requestDto) {
        try {
            // 리액트가 보낸 데이터가 자바에 잘 들어왔는지 콘솔에 먼저 찍어보는 로그
            System.out.println("받은 의류 사진 개수: " + (requestDto.getClothingImages() != null ? requestDto.getClothingImages().size() : 0));
            System.out.println("받은 신체 정보 JSON: " + requestDto.getUserInfo());

            // [연동] 서비스 로직으로 데이터 위임
            Map<String, Object> result = recommendationService.processRecommendation(requestDto);
            
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.putAll(result);
            return response;
            
        } catch (Exception e) {
            return Map.of("status", "fail", "error", e.getMessage());
        }
    }
    
    // [테스트] 통합 데이터 확인용 프론트엔드 페이지
    @GetMapping("/upload-page")
    public String getUploadPage() {
        return "<html>...</html>"; // 기존 HTML 내용 동일 유지
    }
}