package com.example.demo;

import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import java.util.*;

@RestController
@RequestMapping("/api/recommendations")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.OPTIONS})
public class RecommendationController {

    private final RecommendationService recommendationService;
    private final RestTemplate restTemplate;

    public RecommendationController(RecommendationService recommendationService, RestTemplate restTemplate) { 
        this.recommendationService = recommendationService;
        this.restTemplate = restTemplate;
    }

    @PostMapping("/upload")
    public Map<String, Object> uploadFile(@ModelAttribute UploadRequestDto requestDto) {
        try { return recommendationService.processRecommendation(requestDto); }
        catch (Exception e) { return Map.of("status", "ERROR", "message", e.getMessage()); }
    }

    // 쿼리 파라미터 (?taskId=...) 방식 대응
    @GetMapping("")
    public Map<String, Object> getRecommendationsByQuery(@RequestParam("taskId") String taskId) {
        return recommendationService.getAnalysisResult(taskId);
    }

    // 경로 변수 방식 대응
    @GetMapping("/analysis/{taskId}")
    public Map<String, Object> getAnalysisResult(@PathVariable("taskId") String taskId) {
        return recommendationService.getAnalysisResult(taskId);
    }

    @PostMapping("/validate/body")
    public Map<String, Object> validateBody(@RequestParam("file") MultipartFile file) { return recommendationService.validateBody(file); }

    @PostMapping("/tryon")
    public Map<String, Object> requestNewTryOn(@RequestBody Map<String, Object> request) {
        try {
            String userId = (String) request.get("taskId");
            @SuppressWarnings("unchecked")
            Map<String, Object> garmentInfo = (Map<String, Object>) request.get("garment_info");

            // 캐시 확인 서비스 메서드 호출
            return recommendationService.getOrCreateFitting(userId, garmentInfo);
        } catch (Exception e) {
            return Map.of("status", "ERROR", "message", e.getMessage());
        }
    }
    
    @PostMapping("/gallery/save-fitting")
    public Map<String, Object> saveFittingResult(
            @RequestParam("taskId") String taskId,
            @RequestParam("file") MultipartFile file) {
        try {
            recommendationService.saveFittingResultToFolder(taskId, file.getBytes(), file.getOriginalFilename());
            return Map.of("status", "SUCCESS");
        } catch (Exception e) {
            return Map.of("status", "ERROR", "message", e.getMessage());
        }
    }
}